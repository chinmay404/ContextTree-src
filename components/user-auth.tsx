"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse ring-2 ring-slate-100"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Button 
        onClick={() => signIn()} 
        variant="default"
        className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all"
      >
        Sign In
      </Button>
    );
  }

  if (session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-slate-100 transition-all ring-2 ring-slate-200 hover:ring-slate-300">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={session.user.image || ""}
                alt={session.user.name || "User"}
              />
              <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold">
                {session.user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white border-slate-200 shadow-xl rounded-xl" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none text-slate-900">
                {session.user.name}
              </p>
              <p className="text-xs leading-none text-slate-500">
                {session.user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer hover:bg-slate-50 transition-colors">
            <UserCircle className="mr-2 h-4 w-4 text-slate-600" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-slate-50 transition-colors">
            <Settings className="mr-2 h-4 w-4 text-slate-600" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-200" />
          <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer hover:bg-red-50 text-red-600 transition-colors">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}
