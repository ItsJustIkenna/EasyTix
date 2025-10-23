"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowLeft, RefreshCw, ExternalLink, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SCHEDULED" | "PAID" | "FAILED";
  stripePayoutId: string | null;
  scheduledDate: string;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

interface PayoutSummary {
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  availableBalance: number;
}

interface StripeAccountStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/organizer/payouts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPayouts(data.data.payouts);
        setSummary(data.data.summary);
        setStripeStatus(data.data.stripeAccountStatus);
      } else {
        setError(data.error || "Failed to fetch payouts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const syncPayouts = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/organizer/payouts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        await fetchPayouts(); // Refresh after sync
      } else {
        setError(data.error || "Failed to sync payouts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSyncing(false);
    }
  };

  const startStripeOnboarding = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/organizer/stripe/onboard", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error || "Failed to start onboarding");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "text-green-600 bg-green-50";
      case "SCHEDULED":
        return "text-blue-600 bg-blue-50";
      case "PENDING":
        return "text-yellow-600 bg-yellow-50";
      case "FAILED":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle2 className="h-4 w-4" />;
      case "SCHEDULED":
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payouts...</p>
        </div>
      </div>
    );
  }

  if (!stripeStatus?.connected) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/organizer/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle>Connect Your Bank Account</CardTitle>
                  <CardDescription>
                    Set up Stripe Connect to receive payouts for your ticket sales
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To receive payments from ticket sales, you need to connect your bank account through Stripe.
                This is a secure process that takes just a few minutes.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Government-issued ID</li>
                  <li>Bank account information</li>
                  <li>Business details (if applicable)</li>
                </ul>
              </div>
              <Button onClick={startStripeOnboarding} className="w-full">
                Connect Bank Account
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchPayouts}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/organizer/dashboard">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-blue-600" />
                Payouts
              </h1>
              <p className="text-gray-600 mt-1">Manage your earnings and payout history</p>
            </div>
          </div>
          <Button onClick={syncPayouts} disabled={syncing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Payouts"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary?.totalEarnings || 0)}</p>
              <p className="text-sm text-gray-600 mt-1">From all ticket sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalPaid || 0)}</p>
              <p className="text-sm text-gray-600 mt-1">Received payouts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary?.totalPending || 0)}</p>
              <p className="text-sm text-gray-600 mt-1">Scheduled payouts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.availableBalance || 0)}</p>
              <p className="text-sm text-gray-600 mt-1">Ready to payout</p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Status */}
        {stripeStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Stripe Account Status</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-2">
                {stripeStatus.chargesEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Charges {stripeStatus.chargesEnabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div className="flex items-center gap-2">
                {stripeStatus.payoutsEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Payouts {stripeStatus.payoutsEnabled ? "Enabled" : "Disabled"}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Your recent payouts from Stripe</CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No payouts yet</p>
            ) : (
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                      </div>
                      <div>
                        <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                        <p className="text-sm text-gray-600">
                          {payout.paidAt
                            ? `Paid on ${formatDate(payout.paidAt)}`
                            : `Scheduled for ${formatDate(payout.scheduledDate)}`}
                        </p>
                        {payout.failureReason && (
                          <p className="text-sm text-red-600 mt-1">{payout.failureReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                      {payout.stripePayoutId && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://dashboard.stripe.com/payouts/${payout.stripePayoutId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
