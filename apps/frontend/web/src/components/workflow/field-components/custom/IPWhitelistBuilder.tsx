import { useState } from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BaseFieldProps } from '../types';
import { Shield, Plus, X } from 'lucide-react';

const IP_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

export function IPWhitelistBuilder({ name, control, metadata, disabled }: BaseFieldProps) {
  const [newIP, setNewIP] = useState('');
  const [ipError, setIPError] = useState('');

  const validateIP = (ip: string): boolean => {
    return IP_REGEX.test(ip);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const ipList: string[] = (field.value as string[]) || [];

        const addIP = () => {
          const trimmed = newIP.trim();
          if (!trimmed) {
            setIPError('Please enter an IP address');
            return;
          }

          if (!validateIP(trimmed)) {
            setIPError('Invalid IP address or CIDR format (e.g., 192.168.1.1 or 10.0.0.0/24)');
            return;
          }

          if (ipList.includes(trimmed)) {
            setIPError('This IP is already in the whitelist');
            return;
          }

          field.onChange([...ipList, trimmed]);
          setNewIP('');
          setIPError('');
        };

        const removeIP = (ip: string) => {
          field.onChange(ipList.filter(item => item !== ip));
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addIP();
          }
        };

        return (
          <FormItem data-testid={`field-${name}`}>
            <FormLabel className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {metadata.label}
              {metadata.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>

            <FormControl>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newIP}
                    onChange={(e) => {
                      setNewIP(e.target.value);
                      setIPError('');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="192.168.1.1 or 10.0.0.0/24"
                    disabled={disabled}
                    className={ipError ? 'border-red-500' : 'bg-white/70 backdrop-blur-sm border-white/30'}
                    data-testid={`input-new-ip`}
                  />
                  <Button
                    type="button"
                    onClick={addIP}
                    disabled={disabled}
                    variant="outline"
                    size="icon"
                    data-testid="button-add-ip"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {ipError && (
                  <p className="text-xs text-red-500">{ipError}</p>
                )}

                {ipList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Whitelisted IPs ({ipList.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {ipList.map((ip) => (
                        <Badge
                          key={ip}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                          data-testid={`badge-ip-${ip}`}
                        >
                          <span className="font-mono text-xs">{ip}</span>
                          {!disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => removeIP(ip)}
                              data-testid={`button-remove-ip-${ip}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {ipList.length === 0 && (
                  <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                    No IP addresses whitelisted. All IPs will be allowed.
                  </div>
                )}
              </div>
            </FormControl>

            {metadata.description && (
              <FormDescription className="text-xs">
                {metadata.description}
              </FormDescription>
            )}

            <div className="text-xs text-muted-foreground">
              Supports IPv4 addresses and CIDR notation (e.g., 192.168.1.0/24)
            </div>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
