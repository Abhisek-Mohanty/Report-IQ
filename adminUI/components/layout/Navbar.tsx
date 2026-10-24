"use client";

import React, { useState } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { Sun, Moon, Bell, Settings, Search, Database, LogOut, User } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import SignIn from "./sign-in";
import { auth } from "@/lib/auth";

export function Navbar() {
  const [name, setName] = React.useState("Guest User");
  const [email, setEmail] = React.useState("");
  const [picture, setPicture] = React.useState("/assets/business.png");
  const [imageError, setImageError] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    try {
      const token = localStorage.getItem("access_token");
      setIsLoggedIn(!!token);

      const profile_info = localStorage.getItem("profile_info");
      if (profile_info) {
        const profile = JSON.parse(profile_info);
        if (profile?.name) {
          setName(profile.name);
        }
        if (profile?.email) {
          setEmail(profile.email);
        }
        if (profile?.picture) {
          setPicture(profile.picture);
          setImageError(false);
        }
      }
    } catch (e) {
      console.warn("Failed to parse profile_info from localStorage:", e);
    }
  }, []);
  const theme = useAnalyticsStore((state) => state.theme);
  const toggleTheme = useAnalyticsStore((state) => state.toggleTheme);
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  const activeDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Search filter
  const filteredDatasets = searchQuery
    ? datasets.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSelectDataset = (id: string) => {
    selectDataset(id);
    setSearchQuery("");
    setIsSearchFocused(false);
    toast.success(`Switched to dataset: ${datasets.find((d) => d.id === id)?.name}`);
  };
  //  const session = await auth()
  //  console.log(session); 

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-20 relative">
      {/* Workspace Info */}
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold font-display text-foreground">
          Workspace: <span className="text-primary font-bold">Default Sandbox</span>
        </div>
        {activeDataset && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
            <Database className="h-3 w-3" />
            <span>{activeDataset.name}</span>
          </div>
        )}
      </div>

      {/* Center Search Bar */}
      {/* <div className="relative max-w-sm w-full mx-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search loaded datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full bg-accent/40 text-foreground border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
          />
        </div> */}

      {/* Search Results Dropdown */}
      {/* {isSearchFocused && searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-[60] p-1 glass-panel-heavy">
            {filteredDatasets.length > 0 ? (
              filteredDatasets.map((d) => (
                <button
                  key={d.id}
                  onMouseDown={() => handleSelectDataset(d.id)}
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-primary hover:text-white flex items-center justify-between transition-colors font-medium"
                >
                  <span className="truncate">{d.name}</span>
                  <span className="opacity-70 text-[10px]">{(d.size / 1024).toFixed(1)} KB</span>
                </button>
              ))
            ) : (
              <div className="text-xs text-muted-foreground p-3 text-center">No datasets match search query</div>
            )}
          </div>
        )}
      </div> */}

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notifications Icon */}
        <button
          onClick={() => setIsNotifyOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground relative transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-card animate-pulse-slow" />
        </button>

        {/* Settings Icon */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-6 bg-border mx-1" />

        {/* User profile info */}
        <div
          className="flex items-center gap-2.5 pl-1.5 cursor-pointer select-none group"
          onClick={() => setIsProfileOpen(true)}
        >
          <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-display font-bold text-xs text-primary shadow-inner overflow-hidden relative transition-transform group-hover:scale-105 shrink-0">
            {picture && !imageError ? (
              <img
                src={picture}
                alt={name || "User"}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="h-full w-full rounded-full object-cover"
              />
            ) : name && name !== "Guest User" ? (
              <span>{name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-none text-foreground group-hover:text-primary transition-colors">
              {name}
            </div>
            {/* {email && (
              <div className="text-[10px] text-muted-foreground truncate max-w-[130px] mt-0.5">
                {email}
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Notifications Modal */}
      <Dialog isOpen={isNotifyOpen} onClose={() => setIsNotifyOpen(false)} title="System Notifications">
        <div className="space-y-3 font-medium">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary flex gap-2">
            <Database className="h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">Welcome to Report IQ!</div>
              <p className="opacity-90 leading-normal">Everything runs 100% in browser. Start by dropping an Excel or CSV file in the Upload tab.</p>
            </div>
          </div>
          <div className="p-3 bg-accent rounded-lg text-xs text-foreground/80 flex gap-2">
            <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-semibold text-foreground mb-0.5">Tip: Privacy First</div>
              <p className="leading-normal">All parser and merge outputs stay strictly on your local machine memory. Zero data leaks.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={() => setIsNotifyOpen(false)}>Close</Button>
        </div>
      </Dialog>

      {/* Profile Modal */}
      <Dialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="User Profile">
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 bg-accent/40 border border-border rounded-xl">
            <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-display font-bold text-base text-primary shadow-inner overflow-hidden shrink-0">
              {picture && !imageError ? (
                <img
                  src={picture}
                  alt={name || "User"}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : name && name !== "Guest User" ? (
                <span>{name.charAt(0).toUpperCase()}</span>
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-foreground text-sm truncate">{name}</div>
              {email ? (
                <div className="text-xs text-muted-foreground truncate">{email}</div>
              ) : (
                <div className="text-xs text-muted-foreground">Guest User Session</div>
              )}
            </div>
          </div>

          <div className="p-3 bg-accent/20 border border-border/60 rounded-lg text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-between">
              <span>Account Status:</span>
              <span className="font-medium text-foreground">
                {isLoggedIn ? "Authenticated (Google SSO)" : "Guest Session"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Security &amp; Storage:</span>
              <span className="font-medium text-foreground">Client-Side Memory (Zero Leaks)</span>
            </div>
          </div>

          <div className="mt-5 flex justify-between items-center pt-2 border-t border-border">
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10 flex items-center gap-1.5"
                onClick={() => {
                  localStorage.removeItem("access_token");
                  localStorage.removeItem("profile_info");
                  setName("Guest User");
                  setEmail("");
                  setPicture("/assets/business.png");
                  setImageError(false);
                  setIsLoggedIn(false);
                  setIsProfileOpen(false);
                  toast.info("Signed out successfully");
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            ) : (
              <div />
            )}
            <Button size="sm" onClick={() => setIsProfileOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Settings Modal */}
      <Dialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Workspace Settings">
        <div className="space-y-4 font-medium text-sm text-foreground/80">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">DATA PROCESSING MODE</label>
            <div className="p-3 bg-accent/40 border border-border rounded-lg text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block mb-0.5">In-Browser Virtual Processing</span>
              All algorithms operate via Javascript V8 engine using allocated browser memory (100% Client-Side).
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">DEFAULT THEME</label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "primary" : "outline"}
                size="sm"
                onClick={() => { useAnalyticsStore.getState().setTheme("light"); toast.info("Switched to Light Theme"); }}
              >
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "primary" : "outline"}
                size="sm"
                onClick={() => { useAnalyticsStore.getState().setTheme("dark"); toast.info("Switched to Dark Theme"); }}
              >
                Dark
              </Button>
            </div>
          </div>
          <div className="border-t border-border pt-4 flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-semibold">Report IQ v1.0.0</span>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => {
              useAnalyticsStore.getState().setDatasets([]);
              setIsSettingsOpen(false);
              toast.info("Workspace cleared successfully!");
            }}>
              Clear All Data
            </Button>
          </div>
        </div>
      </Dialog>
    </header>
  );
}
