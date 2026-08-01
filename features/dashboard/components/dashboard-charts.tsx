"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

export function DashboardCharts({
  bloodTypeData,
  trendData
}: {
  bloodTypeData: { name: string; value: number }[];
  trendData: { date: string; count: number }[];
}) {
  const trendChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  // Keep a per-chart timeout id so a new touch can cancel a still-pending
  // dismiss from the previous touch. Without this, an old timeout can fire
  // AFTER a new bar/point has already been touched, desyncing Recharts'
  // internal active index from what's on screen (stuck/ghost highlight,
  // tooltip rendered over the wrong bar).
  const trendDismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barDismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recharts computes which bar/point is "active" (and where to draw the
  // cursor highlight + tooltip) from native "mousemove" events. Touch does
  // NOT fire mousemove, so on mobile Recharts' internal active-index state
  // never gets updated correctly -- this is exactly why the gray cursor
  // highlight and the tooltip's text end up pointing at two different bars.
  //
  // Fix: manually translate touch events into real mousemove/mouseleave
  // events at the touch's actual coordinates, so Recharts tracks the
  // finger the same way it would track a mouse.
  const dispatchMouseEvent = (
    ref: React.RefObject<HTMLDivElement | null>,
    type: "mousemove" | "mouseleave",
    touch?: React.Touch
  ) => {
    if (!ref.current) return;
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: touch?.clientX,
      clientY: touch?.clientY,
    });
    ref.current.dispatchEvent(event);
  };

  const handleTouchMove = (
    ref: React.RefObject<HTMLDivElement | null>,
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    const touch = e.touches[0];
    if (touch) {
      dispatchMouseEvent(ref, "mousemove", touch);
    }
  };

  const scheduleDismiss = (
    ref: React.RefObject<HTMLDivElement | null>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    // Cancel any dismiss still pending from a previous touch so it can't
    // fire after the user has already moved on to a different bar/point.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      dispatchMouseEvent(ref, "mouseleave");
      timeoutRef.current = null;
    }, 150);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-1 lg:col-span-4 shadow-sm bg-card/60 backdrop-blur-xl border-muted/50">
        <CardHeader>
          <CardTitle>Donation Trends (Last 7 Days)</CardTitle>
          <CardDescription>Number of donations recorded daily</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div
            ref={trendChartRef}
            className="h-[300px] w-full"
            onTouchStart={(e) => handleTouchMove(trendChartRef, e)}
            onTouchMove={(e) => handleTouchMove(trendChartRef, e)}
            onTouchEnd={() => scheduleDismiss(trendChartRef, trendDismissTimeout)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Donations"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 lg:col-span-3 shadow-sm bg-card/60 backdrop-blur-xl border-muted/50">
        <CardHeader>
          <CardTitle>Donors by Blood Type</CardTitle>
          <CardDescription>Distribution of active donors</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={barChartRef}
            className="h-[300px] w-full"
            onTouchStart={(e) => handleTouchMove(barChartRef, e)}
            onTouchMove={(e) => handleTouchMove(barChartRef, e)}
            onTouchEnd={() => scheduleDismiss(barChartRef, barDismissTimeout)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bloodTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--primary))" }}
                />
                <Bar 
                  dataKey="value" 
                  name="Donors"
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}