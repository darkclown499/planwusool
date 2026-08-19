import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function SettingsSection({ title, description, children, action }: SettingsSectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="w-full flex justify-between items-start sm:items-center">
          <div className="text-start">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1.5">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {action && (
        <div className="flex items-center justify-end border-t bg-muted/20 px-6 py-4 rounded-b-lg">
          {action}
        </div>
      )}
    </Card>
  );
}