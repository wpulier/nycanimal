/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CatalogItem } from "@/lib/catalogSchema";
import styles from "@/app/page.module.css";

const blankItem: CatalogItem = {
  slug: "",
  commonName: "",
  kind: "bird",
  sticker: "",
  color: "#a7b7ff",
  angle: 0,
  position: { catalogX: 20, catalogY: 20, mapX: 50, mapY: 50 },
  summary: "",
  seasonalNote: "",
  pageMode: "field-card",
  facts: [""],
  treeRefs: [],
  mediaRefs: [],
  searchNames: [],
  status: "published",
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function AdminStudio() {
  const initialToken = typeof window === "undefined" ? "" : window.sessionStorage.getItem("tompkins-admin-token") ?? "";
  const [token, setToken] = useState(initialToken);
  const [storedToken, setStoredToken] = useState(initialToken);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [item, setItem] = useState<CatalogItem>(blankItem);
  const [factsText, setFactsText] = useState("");
  const [treeRefsText, setTreeRefsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const activeToken = storedToken || token;

  async function loadItems(nextToken = activeToken) {
    if (!nextToken) return;
    const response = await fetch("/api/admin/catalog-items", { headers: authHeaders(nextToken) });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    setItems(data.items ?? []);
  }

  function selectItem(nextItem: CatalogItem) {
    setItem(nextItem);
    setFactsText(nextItem.facts.join("\n"));
    setTreeRefsText((nextItem.treeRefs ?? []).join("\n"));
  }

  async function saveToken(event: FormEvent) {
    event.preventDefault();
    window.sessionStorage.setItem("tompkins-admin-token", token);
    setStoredToken(token);
    setMessage("Token saved for this browser session.");
    await loadItems(token).catch((error) => setMessage(error.message));
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("Saving item...");
    const latitude = item.coordinates?.latitude ?? item.geo?.latitude;
    const longitude = item.coordinates?.longitude ?? item.geo?.longitude;
    const coordinates =
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : undefined;

    const payload: CatalogItem = {
      ...item,
      slug: item.slug || toSlug(item.commonName),
      sticker: item.sticker || item.commonName,
      angle: Number(item.angle),
      position: {
        catalogX: Number(item.position.catalogX),
        catalogY: Number(item.position.catalogY),
        mapX: Number(item.position.mapX),
        mapY: Number(item.position.mapY),
      },
      geo:
        item.geo?.latitude && item.geo?.longitude
          ? {
              latitude: Number(item.geo.latitude),
              longitude: Number(item.geo.longitude),
            }
          : undefined,
      coordinates,
      treeRefs: treeRefsText.split("\n").map((treeRef) => treeRef.trim()).filter(Boolean),
      facts: factsText.split("\n").map((fact) => fact.trim()).filter(Boolean),
      searchNames: [item.commonName, item.sticker, item.latinName].filter(Boolean).map((name) => String(name).toLowerCase()),
      mediaRefs: item.mediaRefs ?? [],
      status: "published",
    };

    const response = await fetch("/api/admin/catalog-items", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(activeToken) },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage(await response.text());
      setBusy(false);
      return;
    }

    setItem(payload);
    await loadItems();
    setMessage(`Saved ${payload.slug}.`);
    setBusy(false);
  }

  async function uploadSticker(event: FormEvent) {
    event.preventDefault();
    if (!file || !item.slug) {
      setMessage("Choose a file and save/select an item first.");
      return;
    }

    setBusy(true);
    setMessage("Uploading sticker...");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("itemSlug", item.slug);
    formData.set("role", "sticker");

    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: authHeaders(activeToken),
      body: formData,
    });

    if (!response.ok) {
      setMessage(await response.text());
      setBusy(false);
      return;
    }

    await loadItems();
    const data = await response.json();
    setItem((current) => ({ ...current, stickerImageUrl: data.asset.downloadUrl, stickerAssetId: data.asset.id }));
    setMessage("Sticker uploaded and attached.");
    setBusy(false);
  }

  return (
    <main className={styles.adminShell}>
      <section className={styles.adminHeader}>
        <div>
          <p className={styles.kicker}>Private studio</p>
          <h1>Sticker catalog admin</h1>
          <p>Publish catalog cards, upload sticker art, and attach media to Firebase-backed field guide pages.</p>
        </div>
        <Link href="/" className={styles.backLink}>Public app</Link>
      </section>

      <form className={styles.adminTokenBar} onSubmit={saveToken}>
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="ADMIN_API_TOKEN" type="password" />
        <button type="submit">Unlock</button>
        <button type="button" onClick={() => loadItems().catch((error) => setMessage(error.message))}>Refresh</button>
      </form>

      <section className={styles.adminGrid}>
        <aside className={styles.adminList}>
          <button type="button" onClick={() => { setItem(blankItem); setFactsText(""); setTreeRefsText(""); }}>
            New catalog item
          </button>
          {items.map((catalogItem) => (
            <button key={catalogItem.slug} type="button" onClick={() => selectItem(catalogItem)}>
              <strong>{catalogItem.commonName}</strong>
              <span>{catalogItem.kind} / {catalogItem.pageMode}</span>
            </button>
          ))}
        </aside>

        <form className={styles.adminForm} onSubmit={saveItem}>
          <label>Common name<input value={item.commonName} onChange={(event) => setItem({ ...item, commonName: event.target.value, slug: item.slug || toSlug(event.target.value) })} /></label>
          <label>Slug<input value={item.slug} onChange={(event) => setItem({ ...item, slug: toSlug(event.target.value) })} /></label>
          <label>Latin name<input value={item.latinName ?? ""} onChange={(event) => setItem({ ...item, latinName: event.target.value || undefined })} /></label>
          <label>Kind<select value={item.kind} onChange={(event) => setItem({ ...item, kind: event.target.value as CatalogItem["kind"] })}><option>bird</option><option>plant</option><option>tree</option><option>mammal</option><option>insect</option><option>fungus</option><option>object</option></select></label>
          <label>Page mode<select value={item.pageMode} onChange={(event) => setItem({ ...item, pageMode: event.target.value as CatalogItem["pageMode"] })}><option value="field-card">field-card</option><option value="scroll-story">scroll-story</option><option value="specimen">specimen</option></select></label>
          <label>Sticker label<input value={item.sticker} onChange={(event) => setItem({ ...item, sticker: event.target.value })} /></label>
          <label>Color<input value={item.color} onChange={(event) => setItem({ ...item, color: event.target.value })} /></label>
          <label>Angle<input type="number" value={item.angle} onChange={(event) => setItem({ ...item, angle: Number(event.target.value) })} /></label>
          <label>Summary<textarea value={item.summary} onChange={(event) => setItem({ ...item, summary: event.target.value })} /></label>
          <label>Season note<textarea value={item.seasonalNote} onChange={(event) => setItem({ ...item, seasonalNote: event.target.value })} /></label>
          <label>Facts, one per line<textarea value={factsText} onChange={(event) => setFactsText(event.target.value)} /></label>
          <label>NYC tree IDs, one per line<textarea value={treeRefsText} onChange={(event) => setTreeRefsText(event.target.value)} placeholder="5103318" /></label>
          <div className={styles.coordGrid}>
            <label>Catalog X<input type="number" value={item.position.catalogX} onChange={(event) => setItem({ ...item, position: { ...item.position, catalogX: Number(event.target.value) } })} /></label>
            <label>Catalog Y<input type="number" value={item.position.catalogY} onChange={(event) => setItem({ ...item, position: { ...item.position, catalogY: Number(event.target.value) } })} /></label>
            <label>Map X<input type="number" value={item.position.mapX} onChange={(event) => setItem({ ...item, position: { ...item.position, mapX: Number(event.target.value) } })} /></label>
            <label>Map Y<input type="number" value={item.position.mapY} onChange={(event) => setItem({ ...item, position: { ...item.position, mapY: Number(event.target.value) } })} /></label>
            <label>Latitude<input type="number" step="0.00000001" value={item.coordinates?.latitude ?? item.geo?.latitude ?? ""} onChange={(event) => setItem({ ...item, coordinates: { latitude: Number(event.target.value), longitude: item.coordinates?.longitude ?? item.geo?.longitude ?? -73.9818 } })} /></label>
            <label>Longitude<input type="number" step="0.00000001" value={item.coordinates?.longitude ?? item.geo?.longitude ?? ""} onChange={(event) => setItem({ ...item, coordinates: { latitude: item.coordinates?.latitude ?? item.geo?.latitude ?? 40.7265, longitude: Number(event.target.value) } })} /></label>
          </div>
          <button disabled={busy || !activeToken} type="submit">Save / publish item</button>
        </form>

        <section className={styles.adminPreview} style={{ "--sticker-color": item.color } as React.CSSProperties}>
          <div className={styles.studioSticker}>
            {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
            <span>{item.sticker || "Sticker"}</span>
          </div>
          <h2>{item.commonName || "New field card"}</h2>
          <p>{item.summary || "Write a summary, upload a sticker, and publish it into the catalog."}</p>
          <form onSubmit={uploadSticker}>
            <input accept="image/*" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <button disabled={busy || !activeToken || !item.slug} type="submit">Upload sticker</button>
          </form>
          {message ? <p className={styles.adminMessage}>{message}</p> : null}
        </section>
      </section>
    </main>
  );
}
