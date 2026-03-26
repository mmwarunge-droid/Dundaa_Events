import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/client";
import BuyCoinsModal from "../components/BuyCoinsModal";
import Leaderboard from "../components/Leaderboard";
import VoteModal from "../components/VoteModal";
import { useAuth } from "../context/AuthContext";

export default function VotingCampaignPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [wallet, setWallet] = useState(null);

  const [joinForm, setJoinForm] = useState({
    display_name: "",
    avatar_url: ""
  });

  const [selectedContestant, setSelectedContestant] = useState(null);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const requests = [
        api.get(`/voting-campaigns/${id}`),
        api.get(`/voting-campaigns/${id}/leaderboard`)
      ];

      if (user) {
        requests.push(api.get("/wallet"));
      }

      const responses = await Promise.all(requests);

      setCampaign(responses[0].data);
      setLeaderboard(responses[1].data || []);
      setWallet(user ? responses[2].data : null);
    } catch (err) {
      console.error("Failed to load voting campaign:", err);
      setError(err?.response?.data?.detail || "Failed to load voting campaign.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, user?.id]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoining(true);
    setError("");

    try {
      await api.post(`/voting-campaigns/${id}/join`, {
        display_name: joinForm.display_name,
        avatar_url: joinForm.avatar_url || null
      });

      setJoinForm({
        display_name: "",
        avatar_url: ""
      });

      await load();
    } catch (err) {
      console.error("Failed to join campaign:", err);
      setError(err?.response?.data?.detail || "Failed to join as contestant.");
    } finally {
      setJoining(false);
    }
  };

  const openVote = (contestant) => {
    if (!user) {
      setError("Please login to vote.");
      return;
    }

    setSelectedContestant(contestant);
    setVoteOpen(true);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "var(--muted)" }}>Loading voting campaign...</p>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <p style={{ color: "tomato" }}>{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="container grid" style={{ gap: 24 }}>
        {error && (
          <p style={{ color: "tomato", margin: 0 }}>
            {error}
          </p>
        )}

        <div className="card" style={{ padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>{campaign?.title}</h1>
          <p style={{ color: "var(--muted)" }}>{campaign?.description || "Voting contest"}</p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <div className="badge">Prize Pool KES {campaign?.prize_pool_amount}</div>
            <div className="badge">Starts {campaign?.start_at}</div>
            <div className="badge">Ends {campaign?.end_at}</div>
          </div>

          {user && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button className="btn" type="button" onClick={() => setBuyCoinsOpen(true)}>
                Buy Coins
              </button>

              <div className="card" style={{ padding: 12 }}>
                <strong>My Coins:</strong> {wallet?.coin_balance || 0}
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Join as contestant</h2>

            <form className="grid grid-2" onSubmit={handleJoin}>
              <input
                className="input"
                placeholder="Display name"
                value={joinForm.display_name}
                onChange={(e) => setJoinForm({ ...joinForm, display_name: e.target.value })}
                required
              />

              <input
                className="input"
                placeholder="Avatar URL (optional)"
                value={joinForm.avatar_url}
                onChange={(e) => setJoinForm({ ...joinForm, avatar_url: e.target.value })}
              />

              <button className="btn" type="submit" disabled={joining}>
                {joining ? "Joining..." : "Join Contest"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-2">
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Contestants</h2>

            {leaderboard.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No contestants yet.</p>
            ) : (
              <div className="grid" style={{ gap: 12 }}>
                {leaderboard.map((item) => (
                  <div key={item.contestant_id} className="card" style={{ padding: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}
                    >
                      <div>
                        <strong>{item.display_name}</strong>
                        <div style={{ color: "var(--muted)" }}>
                          {item.total_votes} votes
                        </div>
                      </div>

                      {user && (
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => openVote(item)}
                        >
                          Vote
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
            <Leaderboard items={leaderboard} />
          </div>
        </div>
      </div>

      <BuyCoinsModal
        isOpen={buyCoinsOpen}
        onClose={() => setBuyCoinsOpen(false)}
        onSuccess={load}
      />

      <VoteModal
        isOpen={voteOpen}
        onClose={() => setVoteOpen(false)}
        contestant={selectedContestant}
        wallet={wallet}
        onSuccess={load}
      />
    </>
  );
}