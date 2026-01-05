import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Scan, Loader2, Eye, EyeOff, BarChart3, Receipt, Users, TrendingUp, UserCog } from "lucide-react";
import { Session, User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<"admin" | "staff">("admin");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check if this is staff login (staff data in session storage)
        const staffData = sessionStorage.getItem('staffSession');
        if (session && !staffData) {
          navigate("/dashboard");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if there's existing staff session
      const staffData = sessionStorage.getItem('staffSession');
      if (staffData) {
        navigate("/dashboard");
        return;
      }
      
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Clear any existing staff session
    sessionStorage.removeItem('staffSession');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
    }

    setLoading(false);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const inputLower = email.toLowerCase().trim();
      
      // Try to find in staff table first (by email)
      const { data: staffList, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("email", inputLower)
        .eq("is_active", true);

      if (staffError) {
        console.error("Staff query error:", staffError);
      }

      // Check waiters table by username OR by display_name
      const { data: waiterList, error: waiterError } = await supabase
        .from("waiters")
        .select("*")
        .eq("is_active", true);

      if (waiterError) {
        console.error("Waiter query error:", waiterError);
      }

      // Filter waiters by username match (case insensitive)
      const matchedWaiters = waiterList?.filter(w => 
        w.username.toLowerCase() === inputLower
      ) || [];

      // Check staff first
      if (staffList && staffList.length > 0) {
        const staff = staffList.find(s => s.password_hash === password);
        
        if (staff) {
          sessionStorage.setItem('staffSession', JSON.stringify({
            id: staff.id,
            email: staff.email,
            display_name: staff.display_name,
            allowed_modules: staff.allowed_modules,
            show_in_bill: staff.show_in_bill,
            created_by: staff.created_by,
            type: 'staff'
          }));

          toast.success(`Welcome, ${staff.display_name}!`);
          navigate("/dashboard");
          setLoading(false);
          return;
        }
      }

      // Check waiters
      if (matchedWaiters.length > 0) {
        const waiter = matchedWaiters.find(w => w.password === password);
        
        if (waiter) {
          sessionStorage.setItem('staffSession', JSON.stringify({
            id: waiter.id,
            email: waiter.username,
            display_name: waiter.display_name,
            allowed_modules: ['waiter'],
            show_in_bill: false,
            created_by: waiter.created_by,
            type: 'waiter'
          }));

          toast.success(`Welcome, ${waiter.display_name}!`);
          navigate("/dashboard");
          setLoading(false);
          return;
        }
      }

      // No match found
      toast.error("Invalid email/username or password");
      setLoading(false);

    } catch (error: any) {
      console.error(error);
      toast.error("Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      {/* Animated Background SVG Graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles */}
        <svg className="absolute top-10 left-10 w-64 h-64 opacity-10 animate-pulse" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="white" />
        </svg>
        <svg className="absolute bottom-20 left-1/4 w-48 h-48 opacity-5 animate-bounce" style={{ animationDuration: '3s' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="white" />
        </svg>
        <svg className="absolute top-1/3 left-20 w-32 h-32 opacity-10 animate-ping" style={{ animationDuration: '4s' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="white" />
        </svg>
        
        {/* Floating rectangles */}
        <svg className="absolute top-1/4 left-1/3 w-20 h-20 opacity-10 animate-spin" style={{ animationDuration: '20s' }} viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" rx="10" fill="white" />
        </svg>
        
        {/* Wave pattern at bottom */}
        <svg className="absolute bottom-0 left-0 w-full h-32 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,64L48,69.3C96,75,192,85,288,90.7C384,96,480,96,576,85.3C672,75,768,53,864,48C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="white" />
        </svg>
        
        {/* Moving dots pattern */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full animate-float"
              style={{
                left: `${Math.random() * 60}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
        
        {/* Gradient overlay lines */}
        <svg className="absolute top-0 right-1/2 w-full h-full opacity-5" viewBox="0 0 400 800">
          <line x1="0" y1="0" x2="400" y2="800" stroke="white" strokeWidth="1" />
          <line x1="100" y1="0" x2="500" y2="800" stroke="white" strokeWidth="1" />
          <line x1="200" y1="0" x2="600" y2="800" stroke="white" strokeWidth="1" />
        </svg>
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Scan className="h-12 w-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
          Eduvanca<br />
          <span className="text-blue-200">Billing</span>
        </h1>
        
        <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-lg">
          The complete billing and inventory management solution for modern businesses. 
          Streamline your operations with powerful GST compliance, real-time analytics, 
          and seamless multi-counter support.
        </p>
        
        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 text-blue-100">
            <div className="p-2 bg-white/10 rounded-lg">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-sm">GST Compliant Invoicing</span>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <div className="p-2 bg-white/10 rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-sm">Real-time Analytics</span>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-sm">Multi-Counter Support</span>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <div className="p-2 bg-white/10 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-sm">Profit Tracking</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <Card className="w-full max-w-md bg-white shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <Scan className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">
              {showForgotPassword ? "Reset Password" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {showForgotPassword 
                ? "Enter your email to receive a reset link" 
                : "Sign in to your Eduvanca account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!showForgotPassword ? (
              <>
                <Tabs value={loginType} onValueChange={(v) => setLoginType(v as "admin" | "staff")} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="admin" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Admin
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Staff
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <form onSubmit={loginType === "admin" ? handleAdminLogin : handleStaffLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      {loginType === "admin" ? "Email Address" : "Email / Username"}
                    </Label>
                    <Input
                      id="email"
                      type={loginType === "admin" ? "email" : "text"}
                      placeholder={loginType === "admin" ? "your@email.com" : "email or username"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      `Sign In as ${loginType === "admin" ? "Admin" : "Staff"}`
                    )}
                  </Button>
                  <div className="text-center space-y-3 pt-2">
                    {loginType === "admin" && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        Forgot your password?
                      </button>
                    )}
                    <p className="text-sm text-gray-500">
                      {loginType === "admin" 
                        ? "Contact admin to create your account" 
                        : "Contact your administrator for staff credentials"
                      }
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-700 font-medium">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add floating animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;