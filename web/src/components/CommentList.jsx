export default function CommentList({ comments }) {
  // Displays event comments as a simple stacked list.
  return (
    <div className="grid" style={{ gap: 12 }}>
      {comments.map((comment) => (
        <div key={comment.id} className="card" style={{ padding: 12 }}>
          <p style={{ margin: 0 }}>{comment.body}</p>
        </div>
      ))}
    </div>
  );
}
