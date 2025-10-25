import { Connection } from "./connection.js";

describe("Connection", () => {
  let connection;

  beforeEach(() => {
    connection = new Connection("A", "B", 2);
  });

  test("should create connection with default weight", () => {
    const defaultConnection = new Connection("C", "D");
    expect(defaultConnection.source).toBe("C");
    expect(defaultConnection.target).toBe("D");
    expect(defaultConnection.weight).toBe(1);
  });

  test("should create connection with specified weight", () => {
    expect(connection.source).toBe("A");
    expect(connection.target).toBe("B"); 
    expect(connection.weight).toBe(2);
  });

  test("should generate correct id", () => {
    expect(connection.id).toBe("A_B");
  });

  test("should check if connection has node", () => {
    expect(connection.hasNode("A")).toBe(true);
    expect(connection.hasNode("B")).toBe(true);
    expect(connection.hasNode("C")).toBe(false);
  });

  test("should clone connection correctly", () => {
    const cloned = connection.clone();
    expect(cloned).toBeInstanceOf(Connection);
    expect(cloned.source).toBe(connection.source);
    expect(cloned.target).toBe(connection.target);
    expect(cloned.weight).toBe(connection.weight);
    expect(cloned).not.toBe(connection); // Should be new instance
  });
});
