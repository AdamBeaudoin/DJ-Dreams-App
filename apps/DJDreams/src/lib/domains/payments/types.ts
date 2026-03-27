export interface PaymentReference {
  id: string
  nullifier: string
  purpose: string
  used: boolean
  verified_at?: string
  transaction_id?: string
}
