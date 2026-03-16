/*
CommentList
-----------
Displays stacked comments for an event.
*/

export default function CommentList({ comments = [] }) {
  if (!comments.length) {
    return <p style={{ color: "#b6b6b6" }}>No comments yet.</p>;
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      {comments.map((comment) => (
        <div key={comment.id} className="card" style={{ padding: 12 }}>
          <p style={{ marginBottom: 4 }}>{comment.body}</p>
          <small style={{ color: "#888" }}>
            User {comment.user_id} • {new Date(comment.created_at).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
  );
}