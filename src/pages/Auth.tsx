 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Lock, Eye, EyeOff } from 'lucide-react';
 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { toast } from 'sonner';
 
 export default function Auth() {
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const { login } = useAuth();
   const navigate = useNavigate();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
     // Simulate a small delay for UX
     await new Promise((resolve) => setTimeout(resolve, 300));
 
     const success = login(password);
     setIsLoading(false);
 
     if (success) {
       toast.success('Bem-vindo ao Dashboard NBL!');
       navigate('/financeiro');
     } else {
       toast.error('Senha incorreta');
       setPassword('');
     }
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-background p-4">
       <Card className="w-full max-w-md border-border bg-card">
         <CardHeader className="text-center space-y-4">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
               N
             </div>
           </div>
           <CardTitle className="text-2xl font-bold text-foreground">
             Dashboard NBL
           </CardTitle>
           <CardDescription className="text-muted-foreground">
             Digite a senha para acessar o painel
           </CardDescription>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 type={showPassword ? 'text' : 'password'}
                 placeholder="Senha"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="pl-10 pr-10 bg-secondary/50 border-border"
                 autoFocus
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
               >
                 {showPassword ? (
                   <EyeOff className="h-4 w-4" />
                 ) : (
                   <Eye className="h-4 w-4" />
                 )}
               </button>
             </div>
             <Button
               type="submit"
               className="w-full"
               disabled={!password || isLoading}
             >
               {isLoading ? 'Entrando...' : 'Entrar'}
             </Button>
           </form>
         </CardContent>
       </Card>
     </div>
   );
 }