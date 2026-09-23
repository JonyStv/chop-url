/*
  Warnings:

  - You are about to drop the column `enlaces_creadeos` on the `usuario` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "enlaces_creadeos",
ADD COLUMN     "enlaces_creados" INTEGER NOT NULL DEFAULT 0;
