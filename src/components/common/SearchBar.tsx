// Search Bar Component with Debouncing and Stability Features

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchResult {
  content: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    subject_name?: string;
    author_name?: string;
  }>;
  subjects: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  users: Array<{
    id: string;
    username: string;
    full_name?: string;
    role: string;
  }>;
  total: number;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  className, 
  placeholder = 'Search content, subjects...', 
  autoFocus = false 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedQuery = useDebounce(query, 300);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search with abort controller for stability
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('school_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          signal: abortControllerRef.current.signal,
          headers
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResult = await response.json();
      setResults(data);
      setIsOpen(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setError(null);
  };

  // Navigate to content
  const handleContentClick = (contentId: string) => {
    navigate(`/content/${contentId}`);
    handleClear();
  };

  // Navigate to subject
  const handleSubjectClick = (subjectId: string) => {
    navigate(`/subject/${subjectId}`);
    handleClear();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div ref={searchRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pr-10 pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
        )}
        {query && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results && (
        <Card className="absolute top-full mt-2 w-full max-h-[500px] overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-4 space-y-4">
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            {results.total === 0 && !error && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No results found for "{query}"
              </div>
            )}

            {/* Content Results */}
            {results.content.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Content</h3>
                {results.content.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleContentClick(item.id)}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.body}
                        </p>
                        {item.subject_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Subject: {item.subject_name}
                          </p>
                        )}
                      </div>
                      <Badge variant={item.type === 'news' ? 'default' : 'secondary'} className="shrink-0">
                        {item.type === 'news' ? 'News' : 'Lesson'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subject Results */}
            {results.subjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Subjects</h3>
                {results.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => handleSubjectClick(subject.id)}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-sm">{subject.name}</h4>
                    {subject.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {subject.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* User Results (Admin only) */}
            {results.users.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Users</h3>
                {results.users.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{user.username}</h4>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground">{user.full_name}</p>
                        )}
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchBar;
