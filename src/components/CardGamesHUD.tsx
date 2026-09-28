/**
 * Tabletop Nexus - Card Games Controller HUD
 * Full interactive gameplay for Blackjack (21), Texas Hold'em Poker, Solitaire, and War
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, RotateCcw, Play, CheckCircle, AlertTriangle, Shield, Layers, HelpCircle, X, ChevronRight } from 'lucide-react';
import { TabletopPieceData } from '../lib/tabletop/types.js';
import { TabletopClient } from '../lib/tabletop/client/TabletopClient.js';

interface Props {
  currentPreset: string;
  client: TabletopClient | null;
  onSelectPreset: (presetName: string) => void;
}

export const CardGamesHUD: React.FC<Props> = ({ currentPreset, client, onSelectPreset }) => {
  const [activeTab, setActiveTab] = useState<'blackjack' | 'poker' | 'solitaire' | 'none'>(() => {
    if (currentPreset === 'blackjack') return 'blackjack';
    if (currentPreset === 'solitaire') return 'solitaire';
    if (currentPreset === 'poker') return 'poker';
    return 'blackjack';
  });

  const [isMinimized, setIsMinimized] = useState(false);

  // Blackjack State
  const [bjPlayerCards, setBjPlayerCards] = useState<string[]>(['A♦', 'K♣']);
  const [bjDealerCards, setBjDealerCards] = useState<string[]>(['10♠', '7♥']);
  const [bjDealerRevealed, setBjDealerRevealed] = useState<boolean>(false);
  const [bjBetAmount, setBjBetAmount] = useState<number>(25);
  const [bjOutcome, setBjOutcome] = useState<string>('★ NATURAL BLACKJACK! PAYS 3:2 ★');
  const [bjGameOver, setBjGameOver] = useState<boolean>(true);

  // Poker State
  const [pokerStage, setPokerStage] = useState<'preflop' | 'flop' | 'turn' | 'river'>('river');

  useEffect(() => {
    if (currentPreset === 'blackjack') setActiveTab('blackjack');
    else if (currentPreset === 'solitaire') setActiveTab('solitaire');
    else if (currentPreset === 'poker') setActiveTab('poker');
  }, [currentPreset]);

  // Card value helper
  const calculateHandScore = (cards: string[]): { score: number; isSoft: boolean; isBust: boolean } => {
    let score = 0;
    let aces = 0;

    for (const card of cards) {
      const rank = card.replace(/[♠♥♦♣]/g, '');
      if (rank === 'A') {
        aces += 1;
        score += 11;
      } else if (['K', 'Q', 'J', '10'].includes(rank)) {
        score += 10;
      } else {
        score += parseInt(rank, 10) || 0;
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return {
      score,
      isSoft: aces > 0 && score <= 21,
      isBust: score > 21,
    };
  };

  const getDealerVisibleScore = () => {
    if (bjDealerRevealed) {
      return calculateHandScore(bjDealerCards).score;
    }
    return calculateHandScore([bjDealerCards[0]]).score;
  };

  // Blackjack Actions
  const handleDealBlackjack = () => {
    if (currentPreset !== 'blackjack') {
      onSelectPreset('blackjack');
    }

    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['♠', '♥', '♦', '♣'];
    const draw = () => `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

    const p1 = draw();
    const p2 = draw();
    const d1 = draw();
    const d2 = draw();

    setBjPlayerCards([p1, p2]);
    setBjDealerCards([d1, d2]);
    setBjDealerRevealed(false);
    setBjGameOver(false);

    // Spawn 3D pieces on table
    if (client) {
      // Clear old cards
      const toRemove = Array.from(client.pieces.values())
        .filter((p) => p.name.includes('Player Card') || p.name.includes('Dealer'))
        .map((p) => p.id);
      toRemove.forEach((id) => client.removePiece(id));

      const h = client.currentTableConfig.height;

      // Dealer card 1 (upcard)
      client.spawnPiece({
        type: 'card',
        name: `Dealer: ${d1}`,
        label: d1,
        position: { x: -0.7, y: h + 0.3, z: -2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: d1.includes('♥') || d1.includes('♦') ? '#dc2626' : '#0f172a',
      });

      // Dealer card 2 (hole card face down)
      client.spawnPiece({
        type: 'card',
        name: `Dealer: ${d2}`,
        label: d2,
        position: { x: 0.7, y: h + 0.3, z: -2.2 },
        rotation: { x: 0, y: 0, z: 1, w: 0 },
        color: '#ffffff',
        secondaryColor: d2.includes('♥') || d2.includes('♦') ? '#dc2626' : '#0f172a',
      });

      // Player cards
      client.spawnPiece({
        type: 'card',
        name: `Player Card: ${p1}`,
        label: p1,
        position: { x: -0.7, y: h + 0.3, z: 2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: p1.includes('♥') || p1.includes('♦') ? '#dc2626' : '#0f172a',
      });
      client.spawnPiece({
        type: 'card',
        name: `Player Card: ${p2}`,
        label: p2,
        position: { x: 0.7, y: h + 0.3, z: 2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: p2.includes('♥') || p2.includes('♦') ? '#dc2626' : '#0f172a',
      });

      client.audio.playCardDeal();
    }

    const pScore = calculateHandScore([p1, p2]);
    if (pScore.score === 21) {
      setBjOutcome('★ NATURAL BLACKJACK! PAYS 3:2 ★');
      setBjDealerRevealed(true);
      setBjGameOver(true);
    } else {
      setBjOutcome('Your turn: Hit or Stand?');
    }
  };

  const handleBlackjackHit = () => {
    if (bjGameOver) return;
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['♠', '♥', '♦', '♣'];
    const newCard = `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;

    const newHand = [...bjPlayerCards, newCard];
    setBjPlayerCards(newHand);

    if (client) {
      const idx = newHand.length - 1;
      client.spawnPiece({
        type: 'card',
        name: `Player Card: ${newCard}`,
        label: newCard,
        position: { x: -0.7 + idx * 1.2, y: client.currentTableConfig.height + 0.3, z: 2.2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: newCard.includes('♥') || newCard.includes('♦') ? '#dc2626' : '#0f172a',
      });
      client.audio.playCardDeal();
    }

    const { score, isBust } = calculateHandScore(newHand);
    if (isBust) {
      setBjOutcome(`💥 BUSTED with ${score}! Dealer wins.`);
      setBjDealerRevealed(true);
      setBjGameOver(true);
    } else if (score === 21) {
      handleBlackjackStand(newHand);
    }
  };

  const handleBlackjackStand = (playerCards = bjPlayerCards) => {
    if (bjGameOver) return;
    setBjDealerRevealed(true);

    let dCards = [...bjDealerCards];
    let dScore = calculateHandScore(dCards).score;

    // Dealer hits on soft 16, stands on 17+
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['♠', '♥', '♦', '♣'];

    while (dScore < 17) {
      const newDCard = `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;
      dCards.push(newDCard);
      dScore = calculateHandScore(dCards).score;

      if (client) {
        const idx = dCards.length - 1;
        client.spawnPiece({
          type: 'card',
          name: `Dealer: ${newDCard}`,
          label: newDCard,
          position: { x: -0.7 + idx * 1.2, y: client.currentTableConfig.height + 0.3, z: -2.2 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          color: '#ffffff',
          secondaryColor: newDCard.includes('♥') || newDCard.includes('♦') ? '#dc2626' : '#0f172a',
        });
      }
    }

    setBjDealerCards(dCards);
    setBjGameOver(true);

    const pScore = calculateHandScore(playerCards).score;
    if (dScore > 21) {
      setBjOutcome(`🎉 DEALER BUSTS (${dScore})! YOU WIN +$${bjBetAmount * 2}!`);
    } else if (pScore > dScore) {
      setBjOutcome(`🏆 YOU WIN (${pScore} vs ${dScore})! +$${bjBetAmount * 2}`);
    } else if (pScore === dScore) {
      setBjOutcome(`🤝 PUSH (${pScore} vs ${dScore}). Bet returned.`);
    } else {
      setBjOutcome(`Dealer wins (${dScore} vs ${pScore}).`);
    }
  };

  // Texas Hold'em Actions
  const handlePokerDealHole = () => {
    if (currentPreset !== 'poker') onSelectPreset('poker');
    setPokerStage('preflop');
    if (client) {
      client.dealCards(2);
    }
  };

  const handlePokerDealFlop = () => {
    setPokerStage('flop');
    if (client) {
      const h = client.currentTableConfig.height;
      const ranks = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
      const suits = ['♠', '♥', '♦', '♣'];
      for (let i = 0; i < 3; i++) {
        const card = `${ranks[Math.floor(Math.random() * ranks.length)]}${suits[Math.floor(Math.random() * suits.length)]}`;
        client.spawnPiece({
          type: 'card',
          name: `Flop Card ${i + 1}`,
          label: card,
          position: { x: -1.6 + i * 1.3, y: h + 0.25, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          color: '#ffffff',
          secondaryColor: card.includes('♥') || card.includes('♦') ? '#dc2626' : '#0f172a',
        });
      }
      client.audio.playCardDeal();
    }
  };

  const handlePokerDealTurn = () => {
    setPokerStage('turn');
    if (client) {
      const h = client.currentTableConfig.height;
      const card = `A♠`;
      client.spawnPiece({
        type: 'card',
        name: `Turn Card`,
        label: card,
        position: { x: 2.3, y: h + 0.25, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: '#0f172a',
      });
      client.audio.playCardDeal();
    }
  };

  const handlePokerDealRiver = () => {
    setPokerStage('river');
    if (client) {
      const h = client.currentTableConfig.height;
      const card = `K♥`;
      client.spawnPiece({
        type: 'card',
        name: `River Card`,
        label: card,
        position: { x: 3.6, y: h + 0.25, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        color: '#ffffff',
        secondaryColor: '#dc2626',
      });
      client.audio.playCardDeal();
    }
  };

  const pScore = calculateHandScore(bjPlayerCards);
  const dScore = getDealerVisibleScore();

  return (
    <div className="fixed top-14 right-5 z-40 max-w-sm w-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        {/* Game Tabs Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setActiveTab('blackjack');
                if (currentPreset !== 'blackjack') onSelectPreset('blackjack');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'blackjack'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>♠ 21</span>
              <span>Blackjack</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('poker');
                if (currentPreset !== 'poker') onSelectPreset('poker');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'poker'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>♦ Poker</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('solitaire');
                if (currentPreset !== 'solitaire') onSelectPreset('solitaire');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                activeTab === 'solitaire'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>♣ Solitaire</span>
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
          >
            {isMinimized ? 'Expand' : 'Hide'}
          </button>
        </div>

        {!isMinimized && (
          <div className="p-4 space-y-3.5">
            {/* BLACKJACK GAME PANEL */}
            {activeTab === 'blackjack' && (
              <div className="space-y-3">
                {/* Score Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Player Total</div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      {pScore.score} {pScore.isBust ? '(Bust!)' : pScore.score === 21 ? '★ 21' : ''}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {bjPlayerCards.map((c, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded bg-white text-xs font-bold shadow-sm ${
                            c.includes('♥') || c.includes('♦') ? 'text-red-600' : 'text-slate-950'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Dealer Visible</div>
                    <div className="text-xl font-black text-amber-400 font-mono">
                      {dScore} {bjDealerRevealed ? '' : '(+1 Hole)'}
                    </div>
                    <div className="flex gap-1 mt-1 justify-end">
                      {bjDealerCards.map((c, i) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded text-xs font-bold shadow-sm ${
                            i === 1 && !bjDealerRevealed
                              ? 'bg-blue-950 text-blue-300 border border-blue-700'
                              : 'bg-white ' + (c.includes('♥') || c.includes('♦') ? 'text-red-600' : 'text-slate-950')
                          }`}
                        >
                          {i === 1 && !bjDealerRevealed ? '🂠 Hidden' : c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Outcome message */}
                <div className="text-xs font-semibold text-center py-1.5 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {bjOutcome}
                </div>

                {/* Blackjack Controls */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={bjGameOver}
                    onClick={handleBlackjackHit}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>➕ Hit</span>
                  </button>

                  <button
                    disabled={bjGameOver}
                    onClick={() => handleBlackjackStand()}
                    className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>✋ Stand</span>
                  </button>

                  <button
                    onClick={handleDealBlackjack}
                    className="py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Hand</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span>Stack chips to bet • Press <b>F</b> to flip cards</span>
                  <span className="text-amber-400 font-semibold">Bet: $25</span>
                </div>
              </div>
            )}

            {/* POKER GAME PANEL */}
            {activeTab === 'poker' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-300">
                  <b>Texas Hold'em Poker Table:</b> Deal hole cards to private seats, then reveal community cards in the center!
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePokerDealHole}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <span>🎴 Deal Hole (2)</span>
                  </button>

                  <button
                    onClick={handlePokerDealFlop}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <span>Flop (3 Cards)</span>
                  </button>

                  <button
                    onClick={handlePokerDealTurn}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <span>Turn (4th Card)</span>
                  </button>

                  <button
                    onClick={handlePokerDealRiver}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <span>River (5th Card)</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <span>Pot Counter in Center</span>
                  <button
                    onClick={() => client?.rollAllDice()}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200"
                  >
                    Collect Chips (G)
                  </button>
                </div>
              </div>
            )}

            {/* SOLITAIRE GAME PANEL */}
            {activeTab === 'solitaire' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-300 leading-relaxed">
                  <b>Klondike Solitaire:</b> Build 4 Foundations (♠♥♦♣) Ace to King. Drag card sequences between the 7 tableau columns!
                </div>

                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    Multi-Selection Stacking Tip:
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Click & drag to box-select a column stack of cards, then drag them together onto another column! Press <b>G</b> to restack cards into a deck.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (client) {
                        client.dealCards(1);
                        client.audio.playCardDeal();
                      }
                    }}
                    className="py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>Draw from Stock</span>
                  </button>

                  <button
                    onClick={() => onSelectPreset('solitaire')}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Board</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
