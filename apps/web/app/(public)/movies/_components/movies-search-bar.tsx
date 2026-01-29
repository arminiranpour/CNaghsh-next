"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

import styles from "../movies.module.css";

type MoviesSearchBarProps = {
  initialQuery?: string;
  className?: string;
};

export function MoviesSearchBar({ initialQuery = "", className }: MoviesSearchBarProps) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const applySearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmed = value.trim();

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    params.delete("page");

    const next = params.toString();
    router.push(next ? `/movies?${next}` : "/movies");
  };

  return (
    <form onSubmit={applySearch} className={cn("w-full", className)} role="search" dir="rtl">
      <div className={styles.searchBar}>
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="جستجوی فیلم یا کارگردان"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          جستجو
        </button>
      </div>
    </form>
  );
}
