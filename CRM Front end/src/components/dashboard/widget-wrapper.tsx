import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WidgetWrapperProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function WidgetWrapper({ title, children, className }: WidgetWrapperProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
