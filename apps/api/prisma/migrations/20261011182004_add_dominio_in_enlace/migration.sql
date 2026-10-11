/*
  Warnings:

  - A unique constraint covering the columns `[usuario_id]` on the table `dominio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "enlace" ADD COLUMN     "dominio_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "dominio_usuario_id_key" ON "dominio"("usuario_id");

-- CreateIndex
CREATE INDEX "idx_enlace_dominio_id" ON "enlace"("dominio_id");

-- AddForeignKey
ALTER TABLE "enlace" ADD CONSTRAINT "fk_enlace_dominio" FOREIGN KEY ("dominio_id") REFERENCES "dominio"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
