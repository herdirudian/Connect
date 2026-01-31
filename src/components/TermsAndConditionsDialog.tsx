import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function TermsAndConditionsDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col z-[60]">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read our terms and conditions carefully before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-4 text-sm text-gray-600 space-y-4 text-justify">
          <section>
            <h3 className="font-bold text-gray-900 mb-2">1. Booking & Payments</h3>
            <p>
              All bookings are subject to availability. Full payment is required to confirm your reservation. 
              Prices are in IDR and include applicable taxes unless otherwise stated.
              We reserve the right to cancel any booking that appears to be fraudulent.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-2">2. Cancellation & Refund Policy</h3>
            <p>
              <strong>Tickets & Attractions:</strong> All attraction tickets are non-refundable and non-transferable once purchased.
              Date changes may be accommodated subject to availability and must be requested at least 24 hours in advance.
            </p>
            <p className="mt-2">
              <strong>Accommodations:</strong> Cancellations made 7 days prior to check-in will receive a 50% refund. 
              Cancellations within 7 days of check-in are non-refundable. No-shows will be charged the full amount.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-2">3. Entry & Conduct</h3>
            <p>
              The management reserves the right to refuse entry or remove guests who behave in a disorderly manner, 
              violate safety rules, or cause distress to other guests or staff. No outside food or beverages are allowed 
              in the restaurant areas.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-2">4. Safety & Liability</h3>
            <p>
              Guests participate in activities at their own risk. Family The Lodge is not liable for any personal injury, 
              loss, or damage to personal property. Parents/guardians are responsible for the supervision of their children at all times.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-2">5. Force Majeure</h3>
            <p>
              We are not liable for failure to perform our obligations if such failure is as a result of Acts of God 
              (including fire, flood, earthquake, storm, hurricane or other natural disaster), war, invasion, act of foreign enemies, 
              hostilities, civil war, rebellion, revolution, insurrection, military or usurped power or confiscation, 
              terrorist activities, nationalization, government sanction, blockage, embargo, labor dispute, strike, lockout, 
              interruption or failure of electricity or telephone service.
            </p>
          </section>

           <section>
            <h3 className="font-bold text-gray-900 mb-2">6. Privacy Policy</h3>
            <p>
              By making a booking, you agree to our collection and use of your personal data for the purpose of processing 
              your reservation and improving our services. We do not share your data with third parties without your consent.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
