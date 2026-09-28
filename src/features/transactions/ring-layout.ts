/**
 * Distribuisce le icone categoria attorno alla ciambella, come in Monefy:
 * riga in alto, colonna sinistra, colonna destra, riga in basso.
 */
export function ringLayout<T>(items: T[], perSide = 4) {
  const take = (from: number) => items.slice(from * perSide, (from + 1) * perSide);
  return { top: take(0), left: take(1), right: take(2), bottom: take(3) };
}
