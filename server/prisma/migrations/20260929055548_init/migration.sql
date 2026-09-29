-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "user_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id","permission")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lane_name" TEXT NOT NULL,
    "gate_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'operator',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL,
    "session_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
    "lane_in" TEXT NOT NULL,
    "amount" INTEGER,
    "paid_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "parking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "lane_name" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "opened_by_name" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "opening_cash" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT,
    "session_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "operator_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "cancel_reason" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_intents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "qr_string" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_QR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "fail_reason" TEXT,

    CONSTRAINT "qr_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emoney_intents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_EMONEY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "result_code" TEXT,
    "message" TEXT,
    "card_masked" TEXT,

    CONSTRAINT "emoney_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "reason" TEXT,
    "device_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_ticket_number_key" ON "parking_sessions"("ticket_number");

-- CreateIndex
CREATE INDEX "idx_sessions_payment_status" ON "parking_sessions"("payment_status");

-- CreateIndex
CREATE INDEX "idx_shifts_status" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "idx_transactions_shift" ON "transactions"("shift_id");

-- CreateIndex
CREATE INDEX "idx_transactions_session" ON "transactions"("session_id");

-- CreateIndex
CREATE INDEX "idx_transactions_created_at" ON "transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_qr_intents_session" ON "qr_intents"("session_id");

-- CreateIndex
CREATE INDEX "idx_qr_intents_status" ON "qr_intents"("status");

-- CreateIndex
CREATE INDEX "idx_emoney_intents_session" ON "emoney_intents"("session_id");

-- CreateIndex
CREATE INDEX "idx_emoney_intents_status" ON "emoney_intents"("status");

-- CreateIndex
CREATE INDEX "idx_audit_created_at" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_correlation" ON "audit_logs"("correlation_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_fkey" FOREIGN KEY ("permission") REFERENCES "permissions"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
