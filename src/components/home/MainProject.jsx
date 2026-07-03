import React from "react";
import "./styles/MainProject.scss";
import { motion as Motion, scale } from "framer-motion";
import { mainprojectList } from "../../utils/mainprojectList";
import ProjectCard from "../projectCard/MainProjectCard";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const MainProject = () => {
  return (
    <div className="inner Mprojects-inner">
      <div className="tits-inner">
        <h1 className="tit tit__">Main Project</h1>
        <p className="txt txt__">
          많은 기능들이 들어가 있고 규모가 넓어진 프로젝트들이 모여있는
          곳입니다.
        </p>
      </div>

      <Motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ amount: 0.2 }}
        className="Main-grid"
      >
        {mainprojectList.map((p) => (
          <Motion.div key={p.title} variants={itemVariants}>
            <ProjectCard {...p} />
          </Motion.div>
        ))}
      </Motion.div>
    </div>
  );
};

export default MainProject;
