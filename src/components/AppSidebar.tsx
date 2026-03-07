import { useState, useRef, useEffect } from "react";
import { Plus, Wallet, FileText, Archive, Trash2, Copy, Pencil } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger } from
"@/components/ui/sidebar";
import { useBudgets, useCreateBudget, useDeleteBudget, useDuplicateBudget, useUpdateBudget, type Budget } from "@/hooks/useBudgets";
import { usePlans, useCreatePlan, useDeletePlan, type Plan } from "@/hooks/usePlans";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface AppSidebarProps {
  activeBudgetId: string | null;
  activePlanId: string | null;
  onSelectBudget: (id: string) => void;
  onSelectPlan: (id: string) => void;
}

export function AppSidebar({ activeBudgetId, activePlanId, onSelectBudget, onSelectPlan }: AppSidebarProps) {
  const { data: budgets = [] } = useBudgets();
  const { data: plans = [] } = usePlans();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const duplicateBudget = useDuplicateBudget();
  const updateBudget = useUpdateBudget();

  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [rollover, setRollover] = useState(false);
  const [planName, setPlanName] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingBudgetId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingBudgetId]);

  const handleStartEdit = (b: Budget, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBudgetId(b.id);
    setEditingName(b.name);
  };

  const handleSaveEdit = () => {
    if (editingBudgetId && editingName.trim()) {
      updateBudget.mutate({ id: editingBudgetId, name: editingName.trim() });
    }
    setEditingBudgetId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") setEditingBudgetId(null);
  };

  const handleCreateBudget = () => {
    if (!budgetName.trim()) return;
    createBudget.mutate({
      name: budgetName.trim(),
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
      end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      rollover_enabled: rollover
    }, {
      onSuccess: (data) => {
        onSelectBudget(data.id);
        setBudgetName("");
        setStartDate(undefined);
        setEndDate(undefined);
        setRollover(false);
        setShowNewBudget(false);
      }
    });
  };

  const handleCreatePlan = () => {
    if (!planName.trim()) return;
    createPlan.mutate({ name: planName.trim() }, {
      onSuccess: (data) => {
        onSelectPlan(data.id);
        setPlanName("");
        setShowNewPlan(false);
      }
    });
  };

  return (
    <Sidebar className="border-r border-border">
      <div className="p-3 flex items-center justify-between border-b border-border bg-secondary">
        <img src={logo} alt="Numa" className="h-8" />
        <SidebarTrigger className="h-6 w-6" />
      </div>

      <SidebarContent>
        {/* Active Budgets */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">Active Budgets</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activeBudgets.map((b) =>
              <SidebarMenuItem key={b.id}>
                  <SidebarMenuButton
                  onClick={() => onSelectBudget(b.id)}
                  className={`justify-between group ${activeBudgetId === b.id ? "bg-secondary text-foreground font-medium" : ""}`}>

                    <span className="flex items-center gap-2 truncate">
                      <Wallet className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{b.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <button
                      onClick={(e) => {e.stopPropagation();duplicateBudget.mutate(b.id, { onSuccess: (data) => onSelectBudget(data.id) });}}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                      title="Duplicate budget">
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                      onClick={(e) => {e.stopPropagation();if (confirm(`Delete "${b.name}"?`)) deleteBudget.mutate(b.id);}}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Budget Dialog */}
        <div className="px-3 pb-2">
          <Dialog open={showNewBudget} onOpenChange={setShowNewBudget}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                <Plus className="h-3.5 w-3.5" /> New Budget
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Budget</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} placeholder="e.g. Jan 1-15 Paycheck" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Start Date (optional)</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 text-xs justify-start font-normal">
                          {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">End Date (optional)</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 text-xs justify-start font-normal">
                          {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <Checkbox checked={rollover} onCheckedChange={(v) => setRollover(!!v)} />
                  Carry over remaining balance to next budget
                </label>
                <Button onClick={handleCreateBudget} className="w-full" disabled={!budgetName.trim()}>
                  Create Budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">Plans</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {plans.map((p) =>
              <SidebarMenuItem key={p.id}>
                  <SidebarMenuButton
                  onClick={() => onSelectPlan(p.id)}
                  className={`justify-between group ${activePlanId === p.id ? "bg-secondary text-foreground font-medium" : ""}`}>

                    <span className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{p.name}</span>
                    </span>
                    <button
                    onClick={(e) => {e.stopPropagation();if (confirm(`Delete plan "${p.name}"?`)) deletePlan.mutate(p.id);}}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-negative">

                      <Trash2 className="h-3 w-3" />
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* New Plan Dialog */}
        <div className="px-3 pb-2">
          <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                <Plus className="h-3.5 w-3.5" /> New Plan
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. What-if Scenario" className="mt-1" />
                </div>
                <Button onClick={handleCreatePlan} className="w-full" disabled={!planName.trim()}>
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Archived */}
        {archivedBudgets.length > 0 &&
        <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">
              <Archive className="h-3 w-3 mr-1 inline" /> Archived
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {archivedBudgets.map((b) =>
              <SidebarMenuItem key={b.id}>
                    <SidebarMenuButton
                  onClick={() => onSelectBudget(b.id)}
                  className={`${activeBudgetId === b.id ? "bg-secondary text-foreground font-medium" : "text-muted-foreground"}`}>

                      <Wallet className="h-3.5 w-3.5 shrink-0 mr-2" />
                      <span className="truncate text-xs">{b.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        }
      </SidebarContent>
    </Sidebar>);

}