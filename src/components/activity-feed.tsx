"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ShoppingCart,
  QrCode,
  RotateCcw,
  DollarSign,
  Calendar,
  Settings,
  Filter,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Activity,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ActivityType = "order" | "scan" | "refund" | "payout" | "event" | "config"

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  meta: string
  timestamp: Date
  details: {
    orderId?: string
    amount?: string
    location?: string
    admin?: string
    eventName?: string
    changes?: string
  }
}

const activityTypeConfig = {
  order: {
    icon: ShoppingCart,
    color: "text-green-500 bg-green-500/10",
    label: "New Order",
  },
  scan: {
    icon: QrCode,
    color: "text-blue-500 bg-blue-500/10",
    label: "Ticket Scanned",
  },
  refund: {
    icon: RotateCcw,
    color: "text-red-500 bg-red-500/10",
    label: "Refund Issued",
  },
  payout: {
    icon: DollarSign,
    color: "text-green-500 bg-green-500/10",
    label: "Payout Processed",
  },
  event: {
    icon: Calendar,
    color: "text-purple-500 bg-purple-500/10",
    label: "Event Created",
  },
  config: {
    icon: Settings,
    color: "text-orange-500 bg-orange-500/10",
    label: "Config Changed",
  },
}

// Mock activity generator
const generateMockActivity = (): ActivityItem => {
  const types: ActivityType[] = ["order", "scan", "refund", "payout", "event", "config"]
  const type = types[Math.floor(Math.random() * types.length)]

  const activities = {
    order: {
      title: "New order #" + Math.floor(Math.random() * 99999) + " for Drake Concert",
      meta: "$" + (Math.random() * 500 + 50).toFixed(2) + " • " + Math.floor(Math.random() * 10 + 1) + " tickets",
      details: {
        orderId: "#" + Math.floor(Math.random() * 99999),
        amount: "$" + (Math.random() * 500 + 50).toFixed(2),
        eventName: "Drake Concert",
      },
    },
    scan: {
      title: "Ticket scanned at Toronto Arena",
      meta: "GA Ticket • Section " + Math.floor(Math.random() * 10 + 1),
      details: {
        location: "Toronto Arena",
        eventName: "Drake Concert",
      },
    },
    refund: {
      title: "Refund issued by Sarah (Support)",
      meta: "$" + (Math.random() * 100 + 10).toFixed(2) + " • Order #" + Math.floor(Math.random() * 99999),
      details: {
        admin: "Sarah (Support)",
        amount: "$" + (Math.random() * 100 + 10).toFixed(2),
        orderId: "#" + Math.floor(Math.random() * 99999),
      },
    },
    payout: {
      title: "Payout sent to Live Nation",
      meta: "$" + (Math.random() * 20000 + 1000).toFixed(2) + " • Drake Concert",
      details: {
        amount: "$" + (Math.random() * 20000 + 1000).toFixed(2),
        eventName: "Drake Concert",
      },
    },
    event: {
      title: "New event: Summer Music Fest",
      meta: "By Toronto Events • Jul 15",
      details: {
        eventName: "Summer Music Fest",
        admin: "Toronto Events",
      },
    },
    config: {
      title: "Platform fees updated to v" + Math.floor(Math.random() * 10 + 1),
      meta: "By Admin John",
      details: {
        admin: "Admin John",
        changes: "Platform fees updated",
      },
    },
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    ...activities[type],
    timestamp: new Date(),
  }
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [filter, setFilter] = useState<"all" | "orders" | "payouts" | "high-value">("all")
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)
  const [newItemsCount, setNewItemsCount] = useState(0)
  const [hasViewed, setHasViewed] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize with some activities
  useEffect(() => {
    const initialActivities = Array.from({ length: 5 }, () => generateMockActivity())
    setActivities(initialActivities)
  }, [])

  // Auto-refresh logic
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        const newActivity = generateMockActivity()
        setActivities((prev) => [newActivity, ...prev].slice(0, 50)) // Keep last 50
        setNewItemsCount((prev) => prev + 1)
        setHasViewed(false)

        // Play sound if enabled
        if (soundEnabled && audioRef.current) {
          audioRef.current.play().catch(() => {
            // Ignore autoplay errors
          })
        }
      }, 5000) // New activity every 5 seconds

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [isPaused, soundEnabled])

  const handleViewActivity = (activity: ActivityItem) => {
    setSelectedActivity(activity)
    if (!hasViewed) {
      setNewItemsCount(0)
      setHasViewed(true)
    }
  }

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true
    if (filter === "orders") return activity.type === "order"
    if (filter === "payouts") return activity.type === "payout"
    if (filter === "high-value") {
      const amount = Number.parseFloat(activity.meta.match(/\$([0-9,]+\.[0-9]{2})/)?.[1]?.replace(",", "") || "0")
      return amount > 1000
    }
    return true
  })

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return "just now"
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago"
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago"
    return Math.floor(seconds / 86400) + "d ago"
  }

  return (
    <>
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <Card className="w-full lg:w-[360px] h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Live Activity</CardTitle>
              {!hasViewed && newItemsCount > 0 && (
                <Badge variant="default" className="h-5 px-2 animate-pulse">
                  {newItemsCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter Activity</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter("all")}>
                    All Activity
                    {filter === "all" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("orders")}>
                    Orders Only
                    {filter === "orders" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("payouts")}>
                    Payouts Only
                    {filter === "payouts" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("high-value")}>
                    High Value (&gt;$1000)
                    {filter === "high-value" && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-1">No recent activity</h3>
              <p className="text-sm text-muted-foreground">
                {isPaused ? "Activity feed is paused" : "Waiting for updates..."}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredActivities.map((activity, index) => {
                const config = activityTypeConfig[activity.type]
                const Icon = config.icon

                return (
                  <button
                    key={activity.id}
                    onClick={() => handleViewActivity(activity)}
                    className={cn(
                      "w-full text-left p-4 border-b hover:bg-accent/50 transition-colors",
                      index === 0 && !hasViewed && "animate-in fade-in slide-in-from-top-2 duration-300",
                    )}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                          config.color,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight mb-1">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.meta}</p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {getRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {filteredActivities.length > 0 && (
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full bg-transparent" size="sm">
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Details Modal */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity &&
                (() => {
                  const config = activityTypeConfig[selectedActivity.type]
                  const Icon = config.icon
                  return (
                    <>
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {config.label}
                    </>
                  )
                })()}
            </DialogTitle>
            <DialogDescription>
              {selectedActivity && new Date(selectedActivity.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm">{selectedActivity.title}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  {selectedActivity.details.orderId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-mono">{selectedActivity.details.orderId}</span>
                    </div>
                  )}
                  {selectedActivity.details.amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold">{selectedActivity.details.amount}</span>
                    </div>
                  )}
                  {selectedActivity.details.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{selectedActivity.details.location}</span>
                    </div>
                  )}
                  {selectedActivity.details.admin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Admin:</span>
                      <span>{selectedActivity.details.admin}</span>
                    </div>
                  )}
                  {selectedActivity.details.eventName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event:</span>
                      <span>{selectedActivity.details.eventName}</span>
                    </div>
                  )}
                  {selectedActivity.details.changes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Changes:</span>
                      <span>{selectedActivity.details.changes}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button className="w-full bg-transparent" variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Context
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
