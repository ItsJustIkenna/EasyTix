"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Search, CalendarX, Loader2, SlidersHorizontal, MapPin, Calendar, DollarSign, X } from "lucide-react";
import { EventCard } from "@/components/event-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  state: string;
  category: string;
  coverImage: string | null;
  organizer: {
    id: string;
    businessName: string;
  };
  ticketTiers: Array<{
    id: string;
    name: string;
    basePrice: number;
    platformMarkup: number;
    platformFee: number;
    totalQuantity: number;
    soldQuantity: number;
  }>;
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date-asc");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: "MUSIC", label: "Music" },
    { value: "SPORTS", label: "Sports" },
    { value: "ARTS", label: "Arts & Culture" },
    { value: "THEATER", label: "Theater" },
    { value: "COMEDY", label: "Comedy" },
    { value: "CONFERENCE", label: "Conference" },
    { value: "FESTIVAL", label: "Festival" },
    { value: "NETWORKING", label: "Networking" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "OTHER", label: "Other" },
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?status=PUBLISHED");
      const data = await response.json();

      if (data.success) {
        setEvents(data.data.events);
      } else {
        setError(data.error || "Failed to load events");
      }
    } catch (err: unknown) {
      setError("Failed to load events");
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort events
  const filteredEvents = events.filter((event) => {
    // Text search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      event.title.toLowerCase().includes(query) ||
      event.venue.toLowerCase().includes(query) ||
      event.city.toLowerCase().includes(query) ||
      event.organizer.businessName.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // City filter
    if (selectedCity !== "all" && event.city !== selectedCity) {
      return false;
    }

    // Category filter
    if (selectedCategory !== "all" && event.category !== selectedCategory) {
      return false;
    }

    // Date range filter
    const eventDate = new Date(event.startDate);
    if (startDate && eventDate < new Date(startDate)) {
      return false;
    }
    if (endDate && eventDate > new Date(endDate)) {
      return false;
    }

    return true;
  });

  // Get unique cities for filter dropdown
  const uniqueCities = Array.from(
    new Set(events.map((event) => event.city))
  ).sort();

  // Calculate price and apply price filter
  const filteredAndPricedEvents = filteredEvents
    .map((event) => {
      const lowestPrice =
        event.ticketTiers.length > 0
          ? Math.min(
              ...event.ticketTiers.map(
                (tier) =>
                  tier.basePrice + tier.platformMarkup + tier.platformFee
              )
            )
          : 0;

      const totalCapacity = event.ticketTiers.reduce(
        (sum, tier) => sum + tier.totalQuantity,
        0
      );

      const totalSold = event.ticketTiers.reduce(
        (sum, tier) => sum + tier.soldQuantity,
        0
      );

      return {
        ...event,
        lowestPrice,
        totalCapacity,
        totalSold,
      };
    })
    .filter((event) => {
      // Price filter
      const priceInDollars = event.lowestPrice / 100;
      if (minPrice && priceInDollars < parseFloat(minPrice)) {
        return false;
      }
      if (maxPrice && priceInDollars > parseFloat(maxPrice)) {
        return false;
      }
      return true;
    });

  // Sort events
  const sortedEvents = [...filteredAndPricedEvents].sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      case "date-desc":
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      case "price-asc":
        return a.lowestPrice - b.lowestPrice;
      case "price-desc":
        return b.lowestPrice - a.lowestPrice;
      case "popularity":
        return (b.totalSold / b.totalCapacity) - (a.totalSold / a.totalCapacity);
      default:
        return 0;
    }
  });

  // Transform for EventCard component
  const transformedEvents = sortedEvents.map((event) => {
    // Format date
    const eventDate = new Date(event.startDate);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const formattedTime = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return {
      id: event.id,
      name: event.title,
      date: formattedDate,
      time: formattedTime,
      venue: `${event.venue}, ${event.city}`,
      organizer: event.organizer.businessName,
      organizerLogo: "/placeholder.svg",
      image: event.coverImage || "/placeholder.svg",
      price: event.lowestPrice / 100, // Convert from cents to dollars
      capacity: event.totalCapacity,
      sold: event.totalSold,
      category: event.category || "OTHER",
    };
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setSelectedCategory("all");
    setStartDate("");
    setEndDate("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("date-asc");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    selectedCity !== "all" ||
    selectedCategory !== "all" ||
    startDate ||
    endDate ||
    minPrice ||
    maxPrice ||
    sortBy !== "date-asc";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EasyTix</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link href="/events" className="text-sm font-medium text-foreground">
              Browse Events
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b bg-accent/30">
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-balance">
                Discover Events
              </h1>
              <p className="mt-4 text-lg text-muted-foreground text-pretty">
                Find tickets to events near you
              </p>

              {/* Search Bar */}
              <div className="mt-8 relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events, teams, or venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>

              {/* Filters */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {/* Filter Toggle Button */}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {[
                            searchQuery && 1,
                            selectedCity !== "all" && 1,
                            selectedCategory !== "all" && 1,
                            startDate && 1,
                            endDate && 1,
                            minPrice && 1,
                            maxPrice && 1,
                          ]
                            .filter(Boolean)
                            .reduce((a, b) => (a || 0) + (b || 0), 0)}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="center">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Filters</h4>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>

                      {/* City Filter */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4" />
                          Location
                        </Label>
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                          <SelectTrigger>
                            <SelectValue placeholder="All cities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All cities</SelectItem>
                            {uniqueCities.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category Filter */}
                      <div className="space-y-2">
                        <Label className="text-sm">Category</Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Range */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Date Range
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              placeholder="From"
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              placeholder="To"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price Range */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          Price Range
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            placeholder="Min"
                            min="0"
                            step="1"
                            className="text-sm"
                          />
                          <Input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            placeholder="Max"
                            min="0"
                            step="1"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-asc">Date: Soonest</SelectItem>
                    <SelectItem value="date-desc">Date: Latest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="popularity">Most Popular</SelectItem>
                  </SelectContent>
                </Select>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-destructive/10 p-6 mb-4">
                <CalendarX className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Error loading events</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchEvents}>Try again</Button>
            </div>
          ) : transformedEvents.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {transformedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <CalendarX className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No events are currently available"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Browse all events
                </Button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Ticket className="h-5 w-5 text-primary" />
                <span className="font-bold">EasyTix</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Digital ticketing made simple.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#features" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 EasyTix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}