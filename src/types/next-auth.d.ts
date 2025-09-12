import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      nome: string
      email: string
      role: 'cliente' | 'parceiro' | 'admin' | 'superadmin'
      tenant_id?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    nome: string
    email: string
    role: 'cliente' | 'parceiro' | 'admin' | 'superadmin'
    tenant_id?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    nome: string
    role: 'cliente' | 'parceiro' | 'admin' | 'superadmin'
    tenant_id?: string
  }
}