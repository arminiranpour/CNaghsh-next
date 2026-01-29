-- AlterTable
ALTER TABLE "_GenreToMovie" ADD CONSTRAINT "_GenreToMovie_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_GenreToMovie_AB_unique";
