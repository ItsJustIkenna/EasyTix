"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Ticket, Download, Loader2, ChevronLeft, CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  orderId: string;
  tierName: string;
  tierDescription: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  price: number;
  status: string;
  qrCode: string | null;
  checkedInAt: Date | null;
  createdAt: Date;
}

interface EventWithTickets {
  event: {
    id: string;
    title: string;
    venue: string;
    address: string;
    city: string;
    state: string;
    startDate: Date;
    endDate: Date;
    coverImage: string | null;
  };
  tickets: Ticket[];
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ticketGroups, setTicketGroups] = useState<EventWithTickets[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferName, setTransferName] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    checkAuthAndFetchTickets();
  }, []);

  const checkAuthAndFetchTickets = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/me");
      if (!authResponse.ok) {
        router.push("/login");
        return;
      }

      const { user } = await authResponse.json();
      setUserId(user.id);

      // Fetch tickets
      const ticketsResponse = await fetch(`/api/tickets/me?userId=${user.id}`);
      if (!ticketsResponse.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const data = await ticketsResponse.json();
      setTicketGroups(data.tickets);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTransferEmail("");
    setTransferName("");
    setTransferDialogOpen(true);
  };

  const handleTransferSubmit = async () => {
    if (!selectedTicket) return;

    setTransferring(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tickets/${selectedTicket.id}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientEmail: transferEmail,
          recipientName: transferName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Transfer Successful",
          description: `Ticket transferred to ${transferName}`,
        });
        setTransferDialogOpen(false);
        // Refresh tickets
        checkAuthAndFetchTickets();
      } else {
        toast({
          title: "Transfer Failed",
          description: data.error || "Failed to transfer ticket",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Transfer error:", error);
      toast({
        title: "Error",
        description: "An error occurred while transferring the ticket",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const downloadTicket = (ticketId: string, qrCode: string, eventTitle: string) => {
    // Create a temporary link to download the QR code
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `ticket-${eventTitle}-${ticketId}.png`;
    link.click();
    
    toast({
      title: "Downloaded",
      description: "Ticket QR code downloaded successfully",
    });
  };

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: Date) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const isUpcoming = (startDate: Date) => {
    return new Date(startDate) > new Date();
  };

  const upcomingEvents = ticketGroups.filter((group) => isUpcoming(group.event.startDate));
  const pastEvents = ticketGroups.filter((group) => !isUpcoming(group.event.startDate));

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
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground">View and manage your event tickets</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {ticketGroups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Tickets Yet</CardTitle>
              <CardDescription>
                You haven't purchased any tickets yet. Browse events to get started!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-6">
              {upcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No upcoming events. Browse events to find something exciting!
                    </p>
                    <div className="flex justify-center mt-4">
                      <Button asChild>
                        <Link href="/events">Browse Events</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                upcomingEvents.map((group) => (
                  <Card key={group.event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl">{group.event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(group.event.startDate)} at {formatTime(group.event.startDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {group.event.venue}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="default">
                          {group.tickets.length} {group.tickets.length === 1 ? "Ticket" : "Tickets"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.tickets.map((ticket, index) => (
                        <div key={ticket.id}>
                          {index > 0 && <Separator />}
                          <div className="grid md:grid-cols-[1fr_200px] gap-4 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{ticket.tierName}</h4>
                                {ticket.checkedInAt ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Checked In
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    Not Checked In
                                  </Badge>
                                )}
                              </div>
                              {ticket.tierDescription && (
                                <p className="text-sm text-muted-foreground">{ticket.tierDescription}</p>
                              )}
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Price: {formatPrice(ticket.price)}</span>
                                <span>•</span>
                                <span>Ticket ID: {ticket.id.slice(0, 8)}...</span>
                              </div>
                              {ticket.checkedInAt && (
                                <p className="text-sm text-green-600">
                                  Checked in on {new Date(ticket.checkedInAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {ticket.qrCode && (
                              <div className="flex flex-col items-center gap-2">
                                <div className="border-2 border-border rounded-lg p-2 bg-white">
                                  <img 
                                    src={ticket.qrCode} 
                                    alt="Ticket QR Code"
                                    className="w-40 h-40"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadTicket(ticket.id, ticket.qrCode!, group.event.title)}
                                  className="w-full"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                {ticket.status === "CONFIRMED" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleTransferClick(ticket)}
                                    className="w-full"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Transfer
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-6">
              {pastEvents.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No past events yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pastEvents.map((group) => (
                  <Card key={group.event.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl">{group.event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(group.event.startDate)} at {formatTime(group.event.startDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {group.event.venue}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Past Event</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {group.tickets.map((ticket, index) => (
                        <div key={ticket.id}>
                          {index > 0 && <Separator />}
                          <div className="py-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{ticket.tierName}</h4>
                              {ticket.checkedInAt && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Attended
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Price: {formatPrice(ticket.price)}</span>
                              {ticket.checkedInAt && (
                                <>
                                  <span>•</span>
                                  <span>Checked in: {new Date(ticket.checkedInAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ticket</DialogTitle>
            <DialogDescription>
              Transfer this ticket to another person. They will receive an email with the updated ticket and QR code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                placeholder="Enter recipient's full name"
                value={transferName}
                onChange={(e) => setTransferName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="Enter recipient's email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>⚠️ Important:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>This action cannot be undone</li>
                <li>The ticket will be removed from your account</li>
                <li>The recipient will receive a new QR code</li>
                <li>You will no longer have access to this ticket</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferSubmit}
              disabled={!transferEmail || !transferName || transferring}
            >
              {transferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Transfer Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
