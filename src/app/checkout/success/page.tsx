"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Download, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OrderDetails {
  orderId: string;
  ticketCount: number;
  message: string;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      setLoading(false);
      return;
    }

    processOrder();
  }, [sessionId]);

  const processOrder = async () => {
    try {
      const response = await fetch("/api/checkout/success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to process order");
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error("Order processing error:", err);
      setError(err instanceof Error ? err.message : "Failed to process order");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Processing your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-center">Payment Error</CardTitle>
            <CardDescription className="text-center">
              {error || "Something went wrong processing your order"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Your payment may have been processed. Please check your email for confirmation,
              or contact support if you need assistance.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/events">Back to Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your tickets have been purchased and sent to your email
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{order.orderId}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Tickets</span>
              <span className="font-semibold text-lg">{order.ticketCount}</span>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Check Your Email</h4>
                <p className="text-sm text-muted-foreground">
                  We've sent your tickets with QR codes to your email address. 
                  Each ticket has a unique QR code that you'll need to present at the venue entrance.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
            <p className="text-sm text-yellow-800">
              Please save your tickets or take screenshots of the QR codes. 
              Each QR code can only be scanned once for entry.
            </p>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href="/events">Browse More Events</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/organizer/profile">View My Profile</Link>
            </Button>
          </div>

          {/* Help */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Didn't receive your email?{" "}
              <Link href="/help" className="text-primary hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
