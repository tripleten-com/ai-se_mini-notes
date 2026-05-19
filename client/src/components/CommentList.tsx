import type { NoteComment } from "../../../shared/types";

type CommentListProps = {
  comments: NoteComment[];
};

function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="comment-list">No comments yet.</p>;
  }

  return (
    <ul className="comment-list">
      {comments.map((comment) => (
        <li key={comment.id}>{comment.body}</li>
      ))}
    </ul>
  );
}

export default CommentList;
