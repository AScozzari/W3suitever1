import { useRequiredTenant } from "@/hooks/useTenantSafety";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Clock, Users, Calendar } from "lucide-react";
import { useState } from "react";

export default function TaskManagementPage() {
  const { tenant } = useRequiredTenant();
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data: tasks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr/tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return await apiRequest("/api/hr/tasks", {
        method: "POST",
        body: { 
          title, 
          type: "task",
          status: "pending",
          startDate: new Date(),
          endDate: new Date(),
          visibility: "team"
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/tasks"] });
      setNewTaskTitle("");
      toast({ title: "Task creato con successo" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/hr/tasks/${id}`, {
        method: "PATCH",
        body: { type: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/tasks"] });
    },
  });

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Task Management</h1>
          <p className="text-gray-500">Gestisci le attività e le assegnazioni del team</p>
        </div>
        <div className="flex gap-3">
          <Input 
            placeholder="Nuovo task..." 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-64"
            data-testid="input-new-task"
          />
          <Button 
            onClick={() => newTaskTitle && createTaskMutation.mutate(newTaskTitle)}
            disabled={createTaskMutation.isPending}
            data-testid="button-create-task"
          >
            <Plus className="mr-2 h-4 w-4" /> Aggiungi Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Pendenti</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks?.filter(t => t.type !== 'completed').length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Attivi</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completati (Oggi)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Attività Recenti
        </h2>
        <div className="grid gap-4">
          {isLoading ? (
            <p>Caricamento...</p>
          ) : tasks?.map((task) => (
            <Card key={task.id} data-testid={`card-task-${task.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant={task.type === 'completed' ? 'outline' : 'default'} className={task.type === 'completed' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>
                    {task.type}
                  </Badge>
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-gray-500">{new Date(task.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateTaskMutation.mutate({ id: task.id, status: 'completed' })}
                    data-testid={`button-complete-task-${task.id}`}
                  >
                    Completa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
