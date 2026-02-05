 import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 
 interface AuthContextType {
   isAuthenticated: boolean;
   login: (password: string) => boolean;
   logout: () => void;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 // Simple password - in production, use env variable or Supabase auth
 const VALID_PASSWORD = 'nbl2024';
 const AUTH_KEY = 'nbl_dashboard_auth';
 
 export function AuthProvider({ children }: { children: ReactNode }) {
   const [isAuthenticated, setIsAuthenticated] = useState(false);
 
   useEffect(() => {
     const stored = localStorage.getItem(AUTH_KEY);
     if (stored === 'true') {
       setIsAuthenticated(true);
     }
   }, []);
 
   const login = (password: string): boolean => {
     if (password === VALID_PASSWORD) {
       localStorage.setItem(AUTH_KEY, 'true');
       setIsAuthenticated(true);
       return true;
     }
     return false;
   };
 
   const logout = () => {
     localStorage.removeItem(AUTH_KEY);
     setIsAuthenticated(false);
   };
 
   return (
     <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
       {children}
     </AuthContext.Provider>
   );
 }
 
 export function useAuth() {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error('useAuth must be used within an AuthProvider');
   }
   return context;
 }