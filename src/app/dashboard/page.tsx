"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Ticket, 
  Calendar, 
  ShoppingBag, 
  TrendingUp, 
  Loader2,
  ArrowRight,
  Clock,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLocalStorage } from "@/lib/localStorage";

interface DashboardStats {
  totalTickets: number;
  upcomingEvents: number;
  totalSpent: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  venue: string;
  startDate: string;
  ticketCount: number;
}

interface RecentTicket {
  id: string;
  eventTitle: string;
  tierName: string;
  purchaseDate: string;
  qrCode: string;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalTickets: 0, upcomingEvents: 0, totalSpent: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const token = getLocalStorage("token");
      
      if (!token) {
        router.push("/login");
        return;
      }

      // Get user info
      const authResponse = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!authResponse.ok) {
        router.push("/login");
        return;
      }

      const authData = await authResponse.json();
      
      if (!authData.success) {
        router.push("/login");
        return;
      }

      const user = authData.data.user;
      setUserName(`${user.firstName} ${user.lastName}`);

      // Fetch tickets
      const ticketsResponse = await fetch("/api/tickets/my-tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        
        if (ticketsData.success) {
          const tickets = ticketsData.data;
          
          // Calculate stats
          const now = new Date();
          const upcoming = tickets.filter((t: any) => new Date(t.event.startDate) > now);
          const totalSpent = tickets.reduce((sum: number, t: any) => sum + t.price, 0);
          
          setStats({
            totalTickets: tickets.length,
            upcomingEvents: upcoming.length,
            totalSpent: totalSpent,
          });

          // Get upcoming events (group by event)
          const eventMap = new Map<string, UpcomingEvent>();
          upcoming.forEach((ticket: any) => {
            const eventId = ticket.event.id;
            if (!eventMap.has(eventId)) {
              eventMap.set(eventId, {
                id: eventId,
                title: ticket.event.title,
                venue: ticket.event.venue,
                startDate: ticket.event.startDate,
                ticketCount: 0,
              });
            }
            const event = eventMap.get(eventId)!;
            event.ticketCount++;
          });
          
          setUpcomingEvents(
            Array.from(eventMap.values())
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .slice(0, 3)
          );

          // Get recent tickets (last 5)
          setRecentTickets(
            tickets
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((t: any) => ({
                id: t.id,
                eventTitle: t.event.title,
                tierName: t.tierName,
                purchaseDate: t.createdAt,
                qrCode: t.qrCode,
              }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {userName}! 👋</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your tickets</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All your purchased tickets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Events you're attending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime ticket purchases
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upcoming Events & Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Events you have tickets for</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No upcoming events</p>
                    <Button asChild>
                      <Link href="/events">Browse Events</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{event.title}</h3>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(event.startDate)}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {event.venue}
                            </div>
                          </div>
                          <Badge variant="secondary" className="mt-2">
                            {event.ticketCount} {event.ticketCount === 1 ? 'Ticket' : 'Tickets'}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/my-tickets">
                            View Tickets
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/events" className="flex flex-col items-center gap-2">
                      <Calendar className="h-6 w-6" />
                      <span>Browse Events</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/my-tickets" className="flex flex-col items-center gap-2">
                      <Ticket className="h-6 w-6" />
                      <span>My Tickets</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/my-orders" className="flex flex-col items-center gap-2">
                      <ShoppingBag className="h-6 w-6" />
                      <span>Order History</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/account" className="flex flex-col items-center gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <span>Account Settings</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>Your latest purchases</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No tickets yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Ticket className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.eventTitle}</p>
                          <p className="text-xs text-muted-foreground">{ticket.tierName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(ticket.purchaseDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {recentTickets.length > 0 && (
                  <Button variant="ghost" className="w-full mt-4" asChild>
                    <Link href="/my-tickets">
                      View All Tickets
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
