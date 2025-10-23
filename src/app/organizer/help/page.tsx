"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Calendar,
  Ticket,
  DollarSign,
  Users,
  Settings,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const helpCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Book,
    color: "text-blue-500",
    faqs: [
      {
        question: "How do I create my first event?",
        answer: "Click on 'Create New Event' from your dashboard. Fill in the event details including title, description, venue, date/time, and ticket tiers. Once you're done, save as draft to review later or publish immediately to make it live.",
      },
      {
        question: "What information do I need to create an event?",
        answer: "You'll need: Event title and description, Venue name and full address, Start and end dates/times, At least one ticket tier with pricing and quantity, and optionally a cover image.",
      },
      {
        question: "How do I set up my organizer profile?",
        answer: "Go to Profile from the sidebar menu. Fill in your business information including business name, contact details, and address. This information will be visible to customers.",
      },
    ],
  },
  {
    id: "events",
    title: "Managing Events",
    icon: Calendar,
    color: "text-green-500",
    faqs: [
      {
        question: "How do I publish an event?",
        answer: "Create your event and save it as a draft. Review all details, then click the 'Publish' button on the event details page. Once published, your event will be visible to customers on the public events page.",
      },
      {
        question: "Can I edit a published event?",
        answer: "Yes, you can edit most event details even after publishing. However, major changes like dates or pricing should be communicated to ticket holders. You cannot delete an event that has sold tickets.",
      },
      {
        question: "How do I unpublish or cancel an event?",
        answer: "Go to your event details page and change the status from 'Published' to 'Draft' or 'Cancelled'. If tickets have been sold, you'll need to process refunds separately.",
      },
      {
        question: "What's the difference between Draft and Published status?",
        answer: "Draft events are only visible to you and not listed publicly. Published events appear on the public events page and can be discovered and purchased by customers.",
      },
    ],
  },
  {
    id: "tickets",
    title: "Tickets & Pricing",
    icon: Ticket,
    color: "text-purple-500",
    faqs: [
      {
        question: "How do I create different ticket types?",
        answer: "When creating an event, you can add multiple ticket tiers (e.g., General Admission, VIP). Each tier can have its own price, quantity, and sale dates. Click 'Add Ticket Tier' to create additional options.",
      },
      {
        question: "What are platform fees?",
        answer: "Platform fees are charges that cover payment processing and platform usage. These fees are typically added to the ticket price and displayed separately to customers during checkout.",
      },
      {
        question: "Can I offer free tickets?",
        answer: "Yes! When creating a ticket tier, set the base price to $0. Free tickets still require checkout to track attendees and manage capacity.",
      },
      {
        question: "How do ticket sales periods work?",
        answer: "Each ticket tier can have specific sale start and end dates. This allows you to create early bird pricing or VIP-only access periods. Tickets become available/unavailable automatically based on these dates.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & Payouts",
    icon: DollarSign,
    color: "text-yellow-500",
    faqs: [
      {
        question: "When do I receive payments?",
        answer: "Payments are processed after your event concludes. Payouts are typically issued within 3-5 business days after the event date, minus platform fees and any chargebacks.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and digital wallets. Customers can securely pay through our integrated payment gateway.",
      },
      {
        question: "How do refunds work?",
        answer: "Refund policies are set by you as the organizer. You can process refunds from the event dashboard. Refunds are returned to the original payment method within 5-10 business days.",
      },
      {
        question: "What are the platform fees?",
        answer: "Platform fees typically range from 2.5% - 5% of the ticket price plus a small per-ticket fee. Exact fees are displayed when you create ticket tiers and can vary based on your plan.",
      },
    ],
  },
  {
    id: "attendees",
    title: "Managing Attendees",
    icon: Users,
    color: "text-pink-500",
    faqs: [
      {
        question: "How do I view my attendee list?",
        answer: "Go to your event page and click on 'Attendees' or 'Tickets Sold'. You'll see a list of all ticket holders with their names, email addresses, and ticket types.",
      },
      {
        question: "Can I export attendee data?",
        answer: "Yes, you can export your attendee list to CSV or Excel format. This is useful for check-in at the door or for sending event updates.",
      },
      {
        question: "How does ticket verification work?",
        answer: "Each ticket has a unique QR code. Use our mobile app or check-in dashboard to scan tickets at the door. Each ticket can only be scanned once to prevent duplicates.",
      },
      {
        question: "Can I message attendees?",
        answer: "Yes, you can send emails to all ticket holders or specific ticket tiers from the event dashboard. Use this for important updates, reminders, or last-minute changes.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Reports & Analytics",
    icon: BarChart3,
    color: "text-orange-500",
    faqs: [
      {
        question: "What analytics are available?",
        answer: "You can view ticket sales over time, revenue by ticket tier, attendance rates, geographic data of your customers, and peak purchase times. Use these insights to optimize future events.",
      },
      {
        question: "How do I track sales performance?",
        answer: "Your dashboard shows real-time sales data including total revenue, tickets sold, and remaining capacity. You can also view trends and compare multiple events.",
      },
      {
        question: "Can I see marketing source data?",
        answer: "Yes, you can track where ticket sales are coming from (social media, email, direct, etc.) using UTM parameters in your event links.",
      },
    ],
  },
];

const quickLinks = [
  { title: "Create Your First Event", href: "/organizer/events/create", icon: Calendar },
  { title: "View Dashboard", href: "/organizer/dashboard", icon: BarChart3 },
  { title: "Manage Profile", href: "/organizer/profile", icon: Settings },
];

export default function OrganizerHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = helpCategories.filter((category) => {
    if (selectedCategory && category.id !== selectedCategory) return false;
    
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      category.title.toLowerCase().includes(query) ||
      category.faqs.some(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/organizer/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <HelpCircle className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Help Center</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about managing events on EasyTix
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((link) => (
          <Card key={link.href} className="hover:bg-accent cursor-pointer transition-colors">
            <CardContent className="pt-6">
              <a href={link.href} className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">{link.title}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Topics
        </Button>
        {helpCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            <category.icon className="h-4 w-4 mr-2" />
            {category.title}
          </Button>
        ))}
      </div>

      {/* FAQ Sections */}
      <div className="space-y-6">
        {filteredCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <category.icon className={`h-6 w-6 ${category.color}`} />
                {category.title}
              </CardTitle>
              <CardDescription>
                {category.faqs.length} article{category.faqs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {category.faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`${category.id}-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse all topics
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Support */}
      <Card className="mt-8 bg-muted/50">
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? Our support team is here to help
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Live Chat</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Available Mon-Fri, 9AM-5PM EST
                </p>
                <Button variant="outline" size="sm">
                  Start Chat
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Email Support</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  support@easytix.com
                </p>
                <Button variant="outline" size="sm">
                  Send Email
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Phone Support</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  1-800-EASYTIX
                </p>
                <Button variant="outline" size="sm">
                  Call Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
