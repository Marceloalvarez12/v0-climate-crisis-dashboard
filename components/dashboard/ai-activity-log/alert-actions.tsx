"use client"

import { Brain, Rocket, Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ActivityItem } from "./types"

// ---------------------------------------------------------------------------
// Action buttons for an alert (Deploy / Notify / Dismiss)
// ---------------------------------------------------------------------------

interface AlertActionsProps {
  activity:   ActivityItem
  onDeploy:   (activity: ActivityItem) => void
  onNotify:   (activity: ActivityItem) => void
  onDismiss:  (id: string) => void
}

export function AlertActions({ activity, onDeploy, onNotify, onDismiss }: AlertActionsProps) {
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <Button size="sm" className="h-6 gap-1 px-2 text-[10px]" onClick={() => onDeploy(activity)}>
        <Rocket className="h-3 w-3" />
        Despachar
      </Button>
      <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]" onClick={() => onNotify(activity)}>
        <Bell className="h-3 w-3" />
        Notificar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-6 w-6 p-0 text-muted-foreground"
        title="Descartar"
        onClick={() => onDismiss(activity.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmation dialog for deploy / notify
// ---------------------------------------------------------------------------

interface ConfirmDialogState {
  open:     boolean
  type:     "deploy" | "notify"
  activity: ActivityItem | null
}

interface ConfirmActionDialogProps {
  state:      ConfirmDialogState
  onChange:   (open: boolean) => void
  onConfirm:  () => void
}

export function ConfirmActionDialog({ state, onChange, onConfirm }: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={state.open} onOpenChange={onChange}>
      <AlertDialogContent className="z-[9999]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {state.type === "deploy" ? (
              <>
                <Rocket className="h-5 w-5 text-primary" />
                Confirmar despacho de recursos
              </>
            ) : (
              <>
                <Bell className="h-5 w-5 text-accent" />
                Confirmar notificación a autoridades
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {state.type === "deploy" ? (
                <>
                  <p>Vas a despachar unidades de emergencia a:</p>
                  <p className="font-semibold text-foreground">{state.activity?.location}</p>
                </>
              ) : (
                <>
                  <p>Se notificará a:</p>
                  <ul className="space-y-1 text-sm">
                    <li>- Defensa Civil de Tucumán</li>
                    <li>- Bomberos de la Provincia</li>
                    <li>- Policía de Tucumán</li>
                  </ul>
                  <p className="font-semibold text-foreground">Ubicación: {state.activity?.location}</p>
                </>
              )}

              {state.activity?.confidence && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Brain className="h-3 w-3" />
                      Confianza del modelo
                    </span>
                    <span className="text-sm font-bold text-violet-400">{state.activity.confidence}%</span>
                  </div>
                  <Progress value={state.activity.confidence} className="h-2" />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {state.type === "deploy" ? "Confirmar despacho" : "Confirmar notificación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
