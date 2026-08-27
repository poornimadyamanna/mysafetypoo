export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'Joker';
export interface Card { rank: Rank; suit: Suit; isJoker?: boolean; }
