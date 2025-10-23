"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  User,
  HelpCircle,
  DollarSign,
  Ticket,
  Calendar,
  TrendingUp,
  LogOut,
  Settings,
  Loader2,
  Menu,
  Camera,
  BarChart3,
  Banknote,
  Receipt,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { getLocalStorage, removeLocalStorage } from "@/lib/localStorage";

interface Event {
  id: string;
  title: string;
  startDate: string;
  coverImage: string | null;
  status: string;
  organizerId: string;
  ticketTiers: Array<{
    totalQuantity: number;
    soldQuantity: number;
    basePrice: number;
    platformMarkup: number;
    platformFee: number;
  }>;
}

interface UserData {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  organizer?: {
    id: string;
    businessName: string;
    businessEmail: string;
  };
  organizers?: Array<{
    id: string;
    businessName: string;
  }>;
  isOrganizer: boolean;
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getLocalStorage("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Verify user is organizer
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success || (!data.data.isOrganizer && data.data.user.role !== "ADMIN")) {
        router.push("/");
        return;
      }

      setUserData(data.data);
      await fetchEvents(data.data);
    } catch (error: unknown) {
      console.error("Auth check failed:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (user: UserData) => {
    try {
      const token = getLocalStorage("token");
      
      // Fetch all events (admin can see all, organizers see their own)
      const response = await fetch("/api/events?limit=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Filter events if user is organizer (not admin)
        let filteredEvents = data.data.events;
        if (user.organizer?.id) {
          // Filter to show only events belonging to this organizer
          filteredEvents = data.data.events.filter((event: Event) =>
            event.organizerId === user.organizer!.id
          );
        }
        console.log('[Dashboard] Filtered events:', filteredEvents.length, 'organizerId:', user.organizer?.id);
        setEvents(filteredEvents);
      }
    } catch (error: unknown) {
      console.error("Failed to fetch events:", error);
    }
  };

  const handleLogout = () => {
    removeLocalStorage("token");
    removeLocalStorage("user");
    router.push("/login");
  };

  const calculateStats = () => {
    const totalTicketsSold = events.reduce(
      (sum, event) =>
        sum +
        event.ticketTiers.reduce((tierSum, tier) => tierSum + tier.soldQuantity, 0),
      0
    );

    const totalTicketsAvailable = events.reduce(
      (sum, event) =>
        sum +
        event.ticketTiers.reduce((tierSum, tier) => tierSum + tier.totalQuantity, 0),
      0
    );

    const totalRevenue = events.reduce(
      (sum, event) =>
        sum +
        event.ticketTiers.reduce(
          (tierSum, tier) =>
            tierSum +
            tier.soldQuantity *
              (tier.basePrice + tier.platformMarkup + tier.platformFee),
          0
        ),
      0
    );

    const publishedEvents = events.filter((e) => e.status === "PUBLISHED").length;

    return {
      totalTicketsSold,
      totalTicketsAvailable,
      totalRevenue: totalRevenue / 100, // Convert from cents
      publishedEvents,
      totalEvents: events.length,
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = calculateStats();
  const organizerName = userData?.organizers?.[0]?.businessName || "Organizer";
  const initials = organizerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } border-r transition-all duration-300 ease-in-out overflow-hidden flex flex-col bg-sidebar`}
      >
        <div className="border-b border-sidebar-border p-4">
          <Link href="/" className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">EasyTix</span>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/organizer/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/organizer/events/create"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Create Event</span>
          </Link>
          <Link
            href="/organizer/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Receipt className="h-5 w-5" />
            <span>Orders</span>
          </Link>
          <Link
            href="/organizer/scanner"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span>Ticket Scanner</span>
          </Link>
          <Link
            href="/organizer/analytics"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </Link>
          <Link
            href="/organizer/payouts"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Banknote className="h-5 w-5" />
            <span>Payouts</span>
          </Link>
          <Link
            href="/organizer/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>
          <Link
            href="/organizer/help"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Help</span>
          </Link>
        </nav>

        <div className="border-t border-sidebar-border p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{organizerName}</span>
                    <span className="text-xs text-muted-foreground">Organizer</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/organizer/profile">
                    <User className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/organizer/settings">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${stats.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {stats.totalTicketsSold} tickets sold
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    of {stats.totalTicketsAvailable} available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                  <Calendar className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.publishedEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalEvents - stats.publishedEvents} drafts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Conversion Rate
                  </CardTitle>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalTicketsAvailable > 0
                      ? (
                          (stats.totalTicketsSold / stats.totalTicketsAvailable) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">Ticket sell-through</p>
                </CardContent>
              </Card>
            </div>

            {/* Events List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Events</CardTitle>
                <Button asChild>
                  <Link href="/organizer/events/create">
                    <PlusCircle className="mr-2 size-4" />
                    Create Event
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="size-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first event to start selling tickets
                    </p>
                    <Button asChild>
                      <Link href="/organizer/events/create">Create Event</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => {
                      const totalSold = event.ticketTiers.reduce(
                        (sum, tier) => sum + tier.soldQuantity,
                        0
                      );
                      const totalAvailable = event.ticketTiers.reduce(
                        (sum, tier) => sum + tier.totalQuantity,
                        0
                      );
                      const progress =
                        totalAvailable > 0 ? (totalSold / totalAvailable) * 100 : 0;

                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div className="size-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {event.coverImage ? (
                              <img
                                src={event.coverImage}
                                alt={event.title}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center">
                                <Ticket className="size-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {event.title}
                              </h3>
                              <Badge
                                variant={
                                  event.status === "PUBLISHED"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {event.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(event.startDate).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {totalSold}/{totalAvailable}
                              </span>
                            </div>
                          </div>

                          <Button variant="outline" asChild>
                            <Link href={`/organizer/events/${event.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </main>
        </div>
      </div>
  );
}