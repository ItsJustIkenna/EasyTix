"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, Loader2, Camera, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  venue: string;
  startDate: string;
  totalTickets: number;
  checkedInTickets: number;
}

interface ScanResult {
  valid: boolean;
  message?: string;
  error?: string;
  ticket?: {
    id: string;
    tierName: string;
    attendeeName: string;
    attendeeEmail?: string;
    price: number;
    checkedInAt: Date;
  };
  alreadyScanned?: boolean;
  checkedInAt?: Date;
}

interface ScanHistoryItem {
  timestamp: Date;
  result: ScanResult;
  ticketId: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [organizerId, setOrganizerId] = useState<string>("");
  const [html5QrcodeScanner, setHtml5QrcodeScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    checkAuthAndFetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      const event = events.find(e => e.id === selectedEventId);
      setSelectedEvent(event || null);
    }
  }, [selectedEventId, events]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [html5QrcodeScanner]);

  const checkAuthAndFetchEvents = async () => {
    try {
      // Check authentication
      const authResponse = await fetch("/api/auth/me");
      if (!authResponse.ok) {
        router.push("/login");
        return;
      }

      const { user, organizer } = await authResponse.json();
      
      if (!organizer) {
        toast({
          title: "Access Denied",
          description: "You must be an organizer to access the scanner",
          variant: "destructive",
        });
        router.push("/organizer/dashboard");
        return;
      }

      setOrganizerId(organizer.id);

      // Fetch organizer's events
      const eventsResponse = await fetch(`/api/events?organizerId=${organizer.id}`);
      if (!eventsResponse.ok) {
        throw new Error("Failed to fetch events");
      }

      const eventsData = await eventsResponse.json();
      
      // Filter for published events only and calculate ticket stats
      const publishedEvents = eventsData
        .filter((e: any) => e.status === "PUBLISHED")
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          venue: e.venue,
          startDate: e.startDate,
          totalTickets: e.ticketTiers?.reduce((sum: number, tier: any) => sum + tier.soldQuantity, 0) || 0,
          checkedInTickets: 0, // Will be fetched separately if needed
        }));

      setEvents(publishedEvents);
      
      if (publishedEvents.length > 0) {
        setSelectedEventId(publishedEvents[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScanResult(null);

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(onScanSuccess, onScanError);
    setHtml5QrcodeScanner(scanner);
  };

  const stopScanning = () => {
    if (html5QrcodeScanner) {
      html5QrcodeScanner.clear().catch(() => {
        // Ignore errors during stop
      });
      setHtml5QrcodeScanner(null);
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanning temporarily
    stopScanning();

    try {
      // Validate ticket
      const response = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrData: decodedText,
          organizerId,
        }),
      });

      const result = await response.json();

      setScanResult(result);

      // Add to history
      if (result.ticket) {
        setScanHistory(prev => [{
          timestamp: new Date(),
          result,
          ticketId: result.ticket.id,
        }, ...prev.slice(0, 9)]); // Keep last 10 scans
      }

      // Update event stats
      if (result.valid && selectedEvent) {
        setSelectedEvent({
          ...selectedEvent,
          checkedInTickets: selectedEvent.checkedInTickets + 1,
        });
      }

      // Show toast
      if (result.valid) {
        toast({
          title: "✓ Valid Ticket",
          description: `${result.ticket?.attendeeName} checked in successfully`,
        });
      } else {
        toast({
          title: "✗ Invalid Ticket",
          description: result.error || "Ticket validation failed",
          variant: "destructive",
        });
      }

      // Auto-restart scanning after 3 seconds
      setTimeout(() => {
        setScanResult(null);
        startScanning();
      }, 3000);
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Error",
        description: "Failed to validate ticket",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setScanResult(null);
        startScanning();
      }, 3000);
    }
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scanning errors (normal when no QR code in view)
    // console.log("Scan error:", errorMessage);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Events Available</CardTitle>
            <CardDescription>
              You don't have any published events to scan tickets for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/organizer/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/organizer/dashboard">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Ticket Scanner</h1>
                <p className="text-sm text-muted-foreground">Scan QR codes to check in attendees</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scanner Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Select Event</CardTitle>
                <CardDescription>Choose which event you're scanning for</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} - {event.venue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedEvent && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedEvent.title}</p>
                        <p className="text-sm text-muted-foreground">{selectedEvent.venue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{selectedEvent.checkedInTickets}/{selectedEvent.totalTickets}</p>
                        <p className="text-sm text-muted-foreground">Checked In</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  {scanning ? "Point camera at ticket QR code" : "Start scanning to check in attendees"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!scanning && !scanResult && (
                  <Button 
                    onClick={startScanning} 
                    className="w-full" 
                    size="lg"
                    disabled={!selectedEventId}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Start Scanning
                  </Button>
                )}

                {scanning && (
                  <div>
                    <div id="qr-reader" className="w-full"></div>
                    <Button 
                      onClick={stopScanning} 
                      variant="outline" 
                      className="w-full mt-4"
                    >
                      Stop Scanning
                    </Button>
                  </div>
                )}

                {scanResult && (
                  <div className={`p-6 rounded-lg border-2 ${
                    scanResult.valid 
                      ? "border-green-500 bg-green-50 dark:bg-green-950" 
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      {scanResult.valid ? (
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                      ) : scanResult.alreadyScanned ? (
                        <AlertCircle className="h-12 w-12 text-orange-600" />
                      ) : (
                        <XCircle className="h-12 w-12 text-red-600" />
                      )}
                      <div>
                        <h3 className="text-xl font-bold">
                          {scanResult.valid ? "Valid Ticket" : scanResult.alreadyScanned ? "Already Scanned" : "Invalid Ticket"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.message || scanResult.error}
                        </p>
                      </div>
                    </div>

                    {scanResult.ticket && (
                      <div className="space-y-2 text-sm">
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Attendee:</span>
                          <span className="font-medium">{scanResult.ticket.attendeeName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ticket Type:</span>
                          <span className="font-medium">{scanResult.ticket.tierName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">{formatPrice(scanResult.ticket.price)}</span>
                        </div>
                        {scanResult.alreadyScanned && scanResult.checkedInAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Previously Scanned:</span>
                            <span className="font-medium">
                              {new Date(scanResult.checkedInAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-4">
                      Scanning will resume in 3 seconds...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scan History Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>Last 10 ticket scans</CardDescription>
              </CardHeader>
              <CardContent>
                {scanHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No scans yet. Start scanning to see history.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.map((item, index) => (
                      <div 
                        key={index}
                        className="p-3 border rounded-lg bg-card"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={item.result.valid ? "default" : "destructive"}>
                            {item.result.valid ? "✓ Valid" : "✗ Invalid"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.timestamp)}
                          </span>
                        </div>
                        {item.result.ticket && (
                          <div className="text-sm">
                            <p className="font-medium truncate">
                              {item.result.ticket.attendeeName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.result.ticket.tierName}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
