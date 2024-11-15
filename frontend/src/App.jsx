import Header from "./components/Header/Header";
import Footer from "./components/Footer";
import MainSection from "./components/MainSection";

function App() {
  return (
    <div className="d-flex flex-column container-fluid min-vh-100">
      <Header />
      <MainSection />
      <Footer />
    </div>
  );
}

export default App;
