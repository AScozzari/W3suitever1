import { useState } from "react";
import { X, ChevronDown, UserPlus } from "lucide-react";
import { User } from "@/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserMultiRoleSelectorProps {
  users: User[];
  selectedAssignees: string[];
  selectedWatchers: string[];
  onAssigneesChange: (userIds: string[]) => void;
  onWatchersChange: (userIds: string[]) => void;
}

type UserRole = "assignee" | "watcher";

export function UserMultiRoleSelector({
  users,
  selectedAssignees,
  selectedWatchers,
  onAssigneesChange,
  onWatchersChange,
}: UserMultiRoleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allSelectedIds = [...selectedAssignees, ...selectedWatchers];

  const getAvailableUsers = () => {
    return users.filter((user) => !allSelectedIds.includes(user.id));
  };

  const getUserInitials = (user: User) => {
    const firstName = user.firstName || user.email.charAt(0);
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    return user.email;
  };

  const handleAddUser = (userId: string) => {
    onAssigneesChange([...selectedAssignees, userId]);
    setOpen(false);
    setSearch("");
  };

  const handleRemoveUser = (userId: string, role: UserRole) => {
    if (role === "assignee") {
      onAssigneesChange(selectedAssignees.filter((id) => id !== userId));
    } else {
      onWatchersChange(selectedWatchers.filter((id) => id !== userId));
    }
  };

  const handleSwitchRole = (userId: string, currentRole: UserRole) => {
    if (currentRole === "assignee") {
      onAssigneesChange(selectedAssignees.filter((id) => id !== userId));
      onWatchersChange([...selectedWatchers, userId]);
    } else {
      onWatchersChange(selectedWatchers.filter((id) => id !== userId));
      onAssigneesChange([...selectedAssignees, userId]);
    }
  };

  const getSelectedUsers = () => {
    const assignees = selectedAssignees
      .map((id) => ({
        user: users.find((u) => u.id === id),
        role: "assignee" as UserRole,
      }))
      .filter((item) => item.user);

    const watchers = selectedWatchers
      .map((id) => ({
        user: users.find((u) => u.id === id),
        role: "watcher" as UserRole,
      }))
      .filter((item) => item.user);

    return [...assignees, ...watchers];
  };

  const filteredUsers = getAvailableUsers().filter((user) => {
    const searchLower = search.toLowerCase();
    const displayName = getUserDisplayName(user).toLowerCase();
    const email = user.email.toLowerCase();
    return displayName.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUsers = getSelectedUsers();

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal border-gray-200 hover:bg-gray-50"
            data-testid="button-add-user"
          >
            <UserPlus className="mr-2 h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Aggiungi utente...</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 border-gray-200 bg-white"
          align="start"
          sideOffset={4}
          data-testid="popover-user-selector"
        >
          <Command className="border-0">
            <CommandInput
              placeholder="Cerca utente per nome o email..."
              value={search}
              onValueChange={setSearch}
              className="border-0"
              data-testid="input-search-user"
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty data-testid="text-no-users">
                Nessun utente trovato
              </CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${getUserDisplayName(user)} ${user.email}`}
                    onSelect={() => handleAddUser(user.id)}
                    className="flex items-center gap-3 hover:bg-gray-50 cursor-pointer px-3 py-2"
                    data-testid={`item-user-${user.id}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white text-xs font-semibold">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {getUserDisplayName(user)}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {user.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50"
          data-testid="empty-state-users"
        >
          <UserPlus className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Nessun utente selezionato
          </p>
          <p className="text-xs text-gray-500 text-center">
            Aggiungi utenti come assegnatari o osservatori
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" data-testid="container-selected-users">
          {selectedUsers.map(({ user, role }) => {
            if (!user) return null;
            
            return (
              <div
                key={`${user.id}-${role}`}
                className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 group"
                data-testid={`chip-user-${user.id}-${role}`}
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white text-[10px] font-semibold">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                
                <span className="text-sm font-medium text-gray-900">
                  {getUserDisplayName(user)}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium transition-colors",
                        role === "assignee"
                          ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                          : "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
                      )}
                      data-testid={`button-role-${user.id}-${role}`}
                    >
                      {role === "assignee" ? "Assegnatario" : "Osservatore"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                    data-testid={`dropdown-role-${user.id}`}
                  >
                    <DropdownMenuItem
                      onClick={() => handleSwitchRole(user.id, role)}
                      disabled={role === "assignee"}
                      className="cursor-pointer"
                      data-testid={`menuitem-make-assignee-${user.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>Rendi Assegnatario</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSwitchRole(user.id, role)}
                      disabled={role === "watcher"}
                      className="cursor-pointer"
                      data-testid={`menuitem-make-watcher-${user.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span>Rendi Osservatore</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => handleRemoveUser(user.id, role)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                  data-testid={`button-remove-${user.id}-${role}`}
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
