"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap, Users, QrCode, BarChart3, Ticket, Share2, CheckCircle2, LogOut, User, LayoutDashboard } from "lucide-react";
import { getLocalStorage, removeLocalStorage } from "@/lib/localStorage";

interface UserData {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  isOrganizer?: boolean;
  organizer?: {
    businessName: string;
  };
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getLocalStorage("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
      }
    } catch (error: unknown) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeLocalStorage("token");
    removeLocalStorage("user");
    setUser(null);
    router.push("/login");
  };

  const getInitials = () => {
    if (!user) return "U";
    const firstName = user.user.firstName || "";
    const lastName = user.user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.user.email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user) return "";
    const firstName = user.user.firstName || "";
    const lastName = user.user.lastName || "";
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return user.user.email;
  };

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
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/events"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse Events
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {!loading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline">{getDisplayName()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{getDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user.user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {user.isOrganizer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/organizer/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {!user.isOrganizer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-tickets" className="cursor-pointer">
                          <Ticket className="mr-2 h-4 w-4" />
                          My Tickets
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-orders" className="cursor-pointer">
                          <BarChart3 className="mr-2 h-4 w-4" />
                          My Orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={user.isOrganizer ? "/organizer/profile" : "/profile"} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" asChild className="border-foreground/20 bg-transparent">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-oHWglulbOnRibg1BF5mPSBgJUgpK3u.png"
              alt="Stadium crowd"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>

          {/* Hero Content */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Dramatic EASYTIX text with smoke effect */}
              <div className="mb-8">
                <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-wider text-white text-smoke uppercase">
                  EASYTIX
                </h1>
              </div>

              {/* Main headline */}
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance drop-shadow-lg">
                Sell tickets. Capture fans. Go digital.
              </h2>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-white/90 mb-10 text-pretty max-w-3xl mx-auto drop-shadow-md">
                Replace paper tickets with instant SMS delivery. Get fan data with every sale. No apps required.
              </p>

              {/* CTAs */}
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 justify-center">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-white font-semibold shadow-xl"
                  asChild
                >
                  <Link href="/signup">Start Selling Tickets</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 font-semibold shadow-xl"
                  asChild
                >
                  <Link href="/events">Browse Events</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y bg-accent/30">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">98%</div>
                <div className="mt-1 text-sm text-muted-foreground">faster delivery</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">5x</div>
                <div className="mt-1 text-sm text-muted-foreground">more fan data</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">Zero</div>
                <div className="mt-1 text-sm text-muted-foreground">paper waste</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">$0</div>
                <div className="mt-1 text-sm text-muted-foreground">upfront cost</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl text-balance">
              Everything you need to sell tickets
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
              Powerful features that make ticketing simple for organizers and fans
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Instant Delivery</h3>
                    <p className="text-muted-foreground">
                      SMS and email tickets sent in seconds. Fans get their tickets immediately after purchase with no
                      delays.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Fan Data Capture</h3>
                    <p className="text-muted-foreground">
                      Get name, email, and phone with every purchase. Build your fan database and market future events.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">QR Scanning</h3>
                    <p className="text-muted-foreground">
                      Staff scan tickets at gates with any device. Fast, secure validation prevents fraud and duplicate
                      entries.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Sales Analytics</h3>
                    <p className="text-muted-foreground">
                      Track revenue, attendance, and trends in real-time. Make data-driven decisions for your events.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-accent/30 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl text-balance">How it works</h2>
              <p className="mt-4 text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                Get started in minutes with our simple three-step process
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                  1
                </div>
                <div className="rounded-lg bg-primary/10 p-3 mb-4">
                  <Ticket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Event</h3>
                <p className="text-muted-foreground">Set date, venue, ticket prices, and event details in minutes</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                  2
                </div>
                <div className="rounded-lg bg-primary/10 p-3 mb-4">
                  <Share2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Share Link</h3>
                <p className="text-muted-foreground">Fans buy tickets online through your custom event page</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">
                  3
                </div>
                <div className="rounded-lg bg-primary/10 p-3 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Scan & Go</h3>
                <p className="text-muted-foreground">Validate QR codes at entry with any smartphone or tablet</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16 md:py-20 shadow-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl text-balance">
              Ready to go digital?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/90 text-pretty max-w-2xl mx-auto">
              Join teams selling tickets with EasyTix
            </p>
            <Button size="lg" variant="secondary" className="mt-8 text-base font-semibold" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Ticket className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">EasyTix</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                Digital ticketing made simple for event organizers and fans.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="text-muted-foreground hover:text-foreground transition-colors">
                    Browse Events
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} EasyTix. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
