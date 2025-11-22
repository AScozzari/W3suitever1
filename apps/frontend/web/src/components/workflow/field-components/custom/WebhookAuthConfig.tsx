import { useState } from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BaseFieldProps } from '../types';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';

type AuthType = 'none' | 'basic' | 'header' | 'jwt';

interface AuthConfig {
  type: AuthType;
  basicAuth?: {
    username: string;
    password: string;
  };
  headerAuth?: {
    headerName: string;
    expectedValue: string;
  };
  jwtAuth?: {
    jwtSecret: string;
    jwtAlgorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256';
    headerName: string;
  };
}

export function WebhookAuthConfig({ name, control, metadata, disabled }: BaseFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const authConfig: AuthConfig = (field.value as AuthConfig) || { type: 'none' };

        const updateAuthConfig = (updates: Partial<AuthConfig>) => {
          field.onChange({ ...authConfig, ...updates });
        };

        const updateBasicAuth = (updates: Partial<AuthConfig['basicAuth']>) => {
          updateAuthConfig({
            basicAuth: { ...authConfig.basicAuth, ...updates } as AuthConfig['basicAuth']
          });
        };

        const updateHeaderAuth = (updates: Partial<AuthConfig['headerAuth']>) => {
          updateAuthConfig({
            headerAuth: { ...authConfig.headerAuth, ...updates } as AuthConfig['headerAuth']
          });
        };

        const updateJwtAuth = (updates: Partial<AuthConfig['jwtAuth']>) => {
          updateAuthConfig({
            jwtAuth: { ...authConfig.jwtAuth, ...updates } as AuthConfig['jwtAuth']
          });
        };

        return (
          <FormItem data-testid={`field-${name}`}>
            <FormLabel className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {metadata.label}
              {metadata.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>

            <FormControl>
              <div className="space-y-4">
                <RadioGroup
                  value={authConfig.type}
                  onValueChange={(type: AuthType) => updateAuthConfig({ type })}
                  className="grid grid-cols-2 gap-2"
                  disabled={disabled}
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="none" id="auth-none" />
                    <Label htmlFor="auth-none" className="text-sm cursor-pointer">None</Label>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="basic" id="auth-basic" />
                    <Label htmlFor="auth-basic" className="text-sm cursor-pointer">Basic Auth</Label>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="header" id="auth-header" />
                    <Label htmlFor="auth-header" className="text-sm cursor-pointer">Header Auth</Label>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="jwt" id="auth-jwt" />
                    <Label htmlFor="auth-jwt" className="text-sm cursor-pointer">JWT Auth</Label>
                  </div>
                </RadioGroup>

                {authConfig.type === 'basic' && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <Label htmlFor="basic-username">Username</Label>
                        <Input
                          id="basic-username"
                          value={authConfig.basicAuth?.username || ''}
                          onChange={(e) => updateBasicAuth({ username: e.target.value })}
                          placeholder="api_user"
                          disabled={disabled}
                          data-testid="input-basic-username"
                        />
                      </div>

                      <div>
                        <Label htmlFor="basic-password">Password</Label>
                        <div className="flex gap-2">
                          <Input
                            id="basic-password"
                            type={showPassword ? 'text' : 'password'}
                            value={authConfig.basicAuth?.password || ''}
                            onChange={(e) => updateBasicAuth({ password: e.target.value })}
                            placeholder="Enter password"
                            disabled={disabled}
                            data-testid="input-basic-password"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={disabled}
                            data-testid="toggle-password-visibility"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {authConfig.type === 'header' && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <Label htmlFor="header-name">Header Name</Label>
                        <Input
                          id="header-name"
                          value={authConfig.headerAuth?.headerName || 'X-API-Key'}
                          onChange={(e) => updateHeaderAuth({ headerName: e.target.value })}
                          placeholder="X-API-Key"
                          disabled={disabled}
                          data-testid="input-header-name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="header-value">Expected Value</Label>
                        <div className="flex gap-2">
                          <Input
                            id="header-value"
                            type={showPassword ? 'text' : 'password'}
                            value={authConfig.headerAuth?.expectedValue || ''}
                            onChange={(e) => updateHeaderAuth({ expectedValue: e.target.value })}
                            placeholder="Enter API key"
                            disabled={disabled}
                            data-testid="input-header-value"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={disabled}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {authConfig.type === 'jwt' && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <Label htmlFor="jwt-secret">JWT Secret</Label>
                        <div className="flex gap-2">
                          <Input
                            id="jwt-secret"
                            type={showSecret ? 'text' : 'password'}
                            value={authConfig.jwtAuth?.jwtSecret || ''}
                            onChange={(e) => updateJwtAuth({ jwtSecret: e.target.value })}
                            placeholder="your-256-bit-secret"
                            disabled={disabled}
                            data-testid="input-jwt-secret"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowSecret(!showSecret)}
                            disabled={disabled}
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="jwt-algorithm">Algorithm</Label>
                        <Select
                          value={authConfig.jwtAuth?.jwtAlgorithm || 'HS256'}
                          onValueChange={(algo: any) => updateJwtAuth({ jwtAlgorithm: algo })}
                          disabled={disabled}
                        >
                          <SelectTrigger id="jwt-algorithm" data-testid="select-jwt-algorithm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HS256">HS256 (HMAC SHA-256)</SelectItem>
                            <SelectItem value="HS384">HS384 (HMAC SHA-384)</SelectItem>
                            <SelectItem value="HS512">HS512 (HMAC SHA-512)</SelectItem>
                            <SelectItem value="RS256">RS256 (RSA SHA-256)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="jwt-header">Header Name</Label>
                        <Input
                          id="jwt-header"
                          value={authConfig.jwtAuth?.headerName || 'Authorization'}
                          onChange={(e) => updateJwtAuth({ headerName: e.target.value })}
                          placeholder="Authorization"
                          disabled={disabled}
                          data-testid="input-jwt-header"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {authConfig.type === 'none' && (
                  <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                        <Lock className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-medium">No Authentication</div>
                          <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Anyone with the webhook URL can trigger this workflow. Consider enabling authentication for security.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </FormControl>

            {metadata.description && (
              <FormDescription className="text-xs">
                {metadata.description}
              </FormDescription>
            )}

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
