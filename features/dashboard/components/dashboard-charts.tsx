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

  // Mobile fix: touch doesn't fire "mouseleave", so Recharts tooltips get stuck.
  // Manually dispatch mouseleave on touch-end to force the tooltip to close.
  const dismissTooltip = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const event = new MouseEvent("mouseleave", { bubbles: true });
      ref.current.dispatchEvent(event);
    }
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
            onTouchEnd={() => setTimeout(() => dismissTooltip(trendChartRef), 2000)}
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
            onTouchEnd={() => setTimeout(() => dismissTooltip(barChartRef), 2000)}
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