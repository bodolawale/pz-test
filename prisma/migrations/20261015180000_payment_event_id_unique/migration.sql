-- Prevent duplicate webhook events, including concurrent deliveries.
CREATE UNIQUE INDEX "Payments_eventId_key" ON "Payments"("eventId");

