'use client'

import { useCallback } from 'react'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import {
  upgradeSessionWithWalletAuth,
  type WalletAuthUpgrade,
} from '@/lib/domains/identity/wallet-auth-client'

type UpgradeContext = 'verify' | 'connect'

interface RunUpgradeOptions {
  /**
   * `verify` — first walletAuth right after World ID verification (chat already
   * works with the fallback name, so messaging is reassuring).
   * `connect` — a signed-in user explicitly connecting their real username.
   */
  context: UpgradeContext
  /** Fallback "Human #xxxxxx" name, used in `verify` copy for non-ok outcomes. */
  fallbackUsername?: string
  /** When provided, a retry affordance is attached to recoverable failures. */
  retry?: () => void
}

/**
 * Single source of truth for the MiniKit walletAuth username upgrade and its
 * status→toast matrix. Runs the upgrade, shows the appropriate toast, and
 * returns the typed result so callers can apply their own state updates.
 */
export function useWalletAuthUpgrade() {
  const { toast } = useToast()

  return useCallback(
    async (nullifier: string, opts: RunUpgradeOptions): Promise<WalletAuthUpgrade> => {
      const result = await upgradeSessionWithWalletAuth(nullifier)
      const { context, fallbackUsername } = opts
      const retryAction = opts.retry
        ? {
            action: (
              <ToastAction altText="Try again" onClick={opts.retry}>
                Try again
              </ToastAction>
            ),
          }
        : {}

      switch (result.status) {
        case 'ok':
          toast({
            title: context === 'verify' ? 'Verified!' : 'Username connected',
            description: result.username
              ? context === 'verify'
                ? `Welcome ${result.username}! You can now chat.`
                : `You're now chatting as ${result.username}.`
              : 'Your World App username will appear shortly.',
          })
          break
        case 'unavailable':
          toast(
            context === 'verify'
              ? {
                  title: 'Verified!',
                  description:
                    'Open DJ Dreams in World App to show your username. You can chat now.',
                }
              : {
                  title: 'Open in World App',
                  description: 'Connect your username from inside World App.',
                  variant: 'destructive',
                }
          )
          break
        case 'rejected':
          toast({
            title: context === 'verify' ? 'Username skipped' : 'Sign-in cancelled',
            description:
              context === 'verify'
                ? `You're chatting as ${fallbackUsername ?? 'a guest name'}. Connect your World App username to show your name.`
                : 'Approve the wallet sign-in to show your username.',
            ...retryAction,
          })
          break
        case 'error':
          toast({
            title: context === 'verify' ? 'Username sign-in failed' : 'Could not connect username',
            description:
              context === 'verify'
                ? `You're chatting as ${fallbackUsername ?? 'a guest name'}. Try connecting your username again.`
                : 'Something went wrong. Please try again.',
            variant: 'destructive',
            ...retryAction,
          })
          break
        default: {
          const _exhaustive: never = result.status
          return _exhaustive
        }
      }

      return result
    },
    [toast]
  )
}
