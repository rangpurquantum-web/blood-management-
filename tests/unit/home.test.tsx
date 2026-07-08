import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the management portal heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Management Portal" })).toBeInTheDocument();
  });
});
