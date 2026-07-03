import React from "react";
import "./MiniProjectCard.scss";
import Tag from "../tag/Tag";
const ProjectCard = ({
  title,
  description,
  tags = [],
  image,
  imageAlt = "",
}) => {
  return (
    <article className="mini-card">
      <div className="mini-thumb">
        <img src={image} alt={imageAlt || title} />
      </div>
      <div className="mini-body">
        <div className="mini-tags">
          {tags.map(({ label, variant }) => (
            <Tag key={label} variant={variant}>
              {label}
            </Tag>
          ))}
        </div>
        <h3 className="mini-card-tit">{title}</h3>
        <p className="desc">{description}</p>
        <div className="mini-styles">
          <button className="view-btn">View</button>
          <button className="code-btn">Code</button>
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
