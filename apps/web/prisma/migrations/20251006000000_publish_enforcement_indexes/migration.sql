-- CreateIndex
CREATE INDEX "Profile_visibility_idx" ON "Profile"("visibility");

-- CreateIndex
CREATE INDEX "UserEntitlement_userId_key_expiresAt_idx" ON "UserEntitlement"("userId", "key", "expiresAt");
