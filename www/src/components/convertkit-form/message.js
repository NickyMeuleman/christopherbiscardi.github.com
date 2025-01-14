import React from "react";
import { css, keyframes } from "@emotion/core";
import styled from "@emotion/styled";
import { Link, Heading, Text } from "sens8";

export default ({
  illustration,
  title,
  body,
  note,
  fullscreen = false,
  articleTitle,
  articleSlug
}) => (
  <Center
    css={css`
      min-height: ${fullscreen ? "70vh" : "auto"};
    `}
  >
    <div>{illustration}</div>
    <Heading>{title}</Heading>
    {body && body}
    {note && (
      <div
        className={css`
          transform: scale(0.85);
        `}
      >
        <Text>{note}</Text>
      </div>
    )}
    {articleTitle && (
      <div>
        <Link to={`/${articleSlug}`}>{articleTitle}</Link>
      </div>
    )}
  </Center>
);

const FadeIn = keyframes`
from, 0% {
    opacity: 0;
}
to, 100% {
    opacity: 1;
}
`;
const Center = styled.div`
  width: 100vw;
  max-width: 100% !important;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  p {
    margin-top: 10px;
    max-width: 400px;
    line-height: 1.5;
    font-weight: 400;
    strong {
      font-weight: 600;
    }
    animation: ${FadeIn} 600ms ease-in-out 1;
  }
  h2 {
    font-size: 26px;
    font-weight: 400;
    margin-bottom: 0;
    margin-top: 25px;
    animation: ${FadeIn} 400ms ease-in-out 1;
  }
`;
