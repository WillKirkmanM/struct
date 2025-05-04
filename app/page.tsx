import JsonToStruct from './components/JsonToStruct';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col p-4">
      <h1 className="text-2xl font-bold text-center mb-4">
        ParsonLabs Struct
      </h1>
      <div className="flex-grow">
        <JsonToStruct />
      </div>
    </div>
  );
}