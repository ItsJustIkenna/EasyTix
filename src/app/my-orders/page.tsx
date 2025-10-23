"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, CreditCard, Loader2, ChevronLeft, Receipt, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  eventId: string;
  eventTitle: string;
  eventVenue: string;
  eventStartDate: Date;
  eventCoverImage: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  ticketCount: number;
  paymentStatus: string;
  stripePaymentIntentId: string | null;
  createdAt: Date;
}

interface Summary {
  totalOrders: number;
  totalSpent: number;
  totalTickets: number;
  completedOrders: number;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  const checkAuthAndFetchOrders = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/me");
      if (!authResponse.ok) {
        router.push("/login");
        return;
      }

      const { user } = await authResponse.json();

      // Fetch orders
      const ordersResponse = await fetch(`/api/orders/me?userId=${user.id}`);
      if (!ordersResponse.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await ordersResponse.json();
      setOrders(data.orders);
      setSummary(data.summary);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      COMPLETED: "default",
      PENDING: "secondary",
      CANCELLED: "destructive",
      REFUNDED: "outline",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    );
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
          <div className="flex items-center gap-4 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">View your order history and details</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Orders</CardDescription>
                <CardTitle className="text-3xl">{summary.totalOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Spent</CardDescription>
                <CardTitle className="text-3xl">{formatPrice(summary.totalSpent)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Tickets</CardDescription>
                <CardTitle className="text-3xl">{summary.totalTickets}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl">{summary.completedOrders}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Orders Yet</CardTitle>
              <CardDescription>
                You haven't placed any orders yet. Browse events to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{order.eventTitle}</CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {order.eventVenue}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.eventStartDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Receipt className="h-3 w-3" />
                          Order #{order.id.slice(0, 8)}... • Placed on {formatDate(order.createdAt)}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatPrice(order.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.ticketCount} {order.ticketCount === 1 ? "ticket" : "tickets"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4" />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4" />
                        Payment: {order.paymentStatus || "Unknown"}
                      </span>
                      {order.stripePaymentIntentId && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {order.stripePaymentIntentId.slice(0, 20)}...
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/events/${order.eventId}`}>
                          View Event
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/my-tickets">
                          View Tickets
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
